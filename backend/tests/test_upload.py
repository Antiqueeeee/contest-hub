"""上传接口：去 EXIF 语义与图片处理测试。

去 EXIF 是隐私合规设计（EXIF 含 GPS/设备信息），处理方式变更不得破坏该行为：
_PROCESS 后图片必须可正常打开、尺寸不变、EXIF 已移除、视觉像素一致。
"""

import io
import os
import tempfile

from PIL import Image


def _make_exif_jpeg() -> bytes:
    """生成一张带 EXIF（含 GPS 字段）的 JPEG。"""
    img = Image.new("RGB", (64, 32), (200, 30, 30))
    exif = Image.Exif()
    exif[0x0110] = "CameraModel-X"          # Model
    exif[0x8825] = {1: "GPSLatitudeRef"}    # GPS IFD（嵌套字典）
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def test_process_image_strips_exif_keeps_pixels():
    from app.api.upload import _process_image

    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "photo.jpg")
        with open(path, "wb") as f:
            f.write(_make_exif_jpeg())

        # 上传原图确认带 EXIF（否则测试无意义）
        with Image.open(path) as before:
            assert before.getexif().get(0x0110) == "CameraModel-X"

        width, height = _process_image(path)

        assert (width, height) == (64, 32)
        with Image.open(path) as after:
            # 尺寸不变、视觉内容未被改动（JPEG 有损压缩允许 ±3 容差，纯色图实际误差 ≤2）
            assert after.size == (64, 32)
            baseline = Image.new("RGB", (64, 32), (200, 30, 30))
            pairs = zip(list(after.getdata()), list(baseline.getdata()))
            avg_diff = sum(abs(a - b) for pa, pb in pairs for a, b in zip(pa, pb)) / (64 * 32 * 3)
            assert avg_diff < 3
            # EXIF 已移除（合规语义：不泄露 GPS/设备信息）
            exif = after.getexif()
            assert exif.get(0x0110) is None
            assert exif.get(0x8825) is None


def test_process_image_best_effort_on_corrupt_file():
    from app.api.upload import _process_image

    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "broken.jpg")
        with open(path, "wb") as f:
            f.write(b"not an image at all")

        # 坏文件：不抛异常、返回 (0,0)、原文件保留
        assert _process_image(path) == (0, 0)
        with open(path, "rb") as f:
            assert f.read() == b"not an image at all"
