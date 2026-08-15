"""轮播图模糊占位图接口测试。

覆盖：按需生成（短边 ~24px JPEG）+ 原子缓存、缓存命中（原图删除后仍可服务）、
非法/缺失/损坏文件名一律 404。conftest 将 UPLOAD_DIR 指向一次性临时目录，
不触碰真实 backend/uploads/。
"""

import io
import os
import uuid

from httpx import ASGITransport

from app.config import get_settings

UPLOAD_DIR = get_settings().upload_dir


def _write_original(name: str, size=(640, 360)) -> None:
    """在测试上传目录写一张真实 PNG 原图。"""
    from PIL import Image
    path = os.path.join(UPLOAD_DIR, name)
    Image.new("RGB", size, (80, 120, 200)).save(path, format="PNG")


def _write_bad(name: str, content: bytes = b"not an image") -> None:
    path = os.path.join(UPLOAD_DIR, name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)


def _valid_name(ext=".png"):
    return f"{uuid.uuid4().hex}{ext}"


async def test_blur_generated_and_cached():
    import httpx
    from app.database import engine
    from app.main import app

    name = _valid_name()
    _write_original(name)

    # 全局引擎连接池可能复用先前用例事件循环的连接（asyncpg 跨 loop 会报错），
    # 测试前后都 dispose，保证本用例在干净连接上运行、也不影响后续用例
    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get(f"/api/public/uploads-blur/{name}")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/jpeg"
        assert "max-age=86400" in r.headers["cache-control"]

        # 占位图短边 ≈ 24px
        from PIL import Image
        with Image.open(io.BytesIO(r.content)) as img:
            assert min(img.size) == 24

        # 缓存文件已生成
        cache = os.path.join(UPLOAD_DIR, ".blur", f"{name}.jpg")
        assert os.path.isfile(cache)
        assert os.path.getsize(cache) > 0
    finally:
        await engine.dispose()


async def test_second_request_served_from_cache():
    import httpx
    from app.database import engine
    from app.main import app

    name = _valid_name()
    _write_original(name)

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r1 = await client.get(f"/api/public/uploads-blur/{name}")
            assert r1.status_code == 200

        # 删除原图后仍走缓存命中，字节一致
        os.remove(os.path.join(UPLOAD_DIR, name))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r2 = await client.get(f"/api/public/uploads-blur/{name}")
        assert r2.status_code == 200
        assert r2.content == r1.content
    finally:
        await engine.dispose()


async def test_404_invalid_filename():
    import httpx
    from app.database import engine
    from app.main import app

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        bad_names = [
            "../etc/passwd",
            "foo.jpg",
            f"{uuid.uuid4().hex}.gif",
            f"{uuid.uuid4().hex}.svg",
            f"{uuid.uuid4().hex.upper()}.PNG",
        ]
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            for bad in bad_names:
                r = await client.get(f"/api/public/uploads-blur/{bad}")
                assert r.status_code == 404, f"{bad} 应 404，实际 {r.status_code}"
    finally:
        await engine.dispose()


async def test_404_unknown_valid_name():
    import httpx
    from app.database import engine
    from app.main import app

    name = _valid_name()  # 合法格式但磁盘上不存在
    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get(f"/api/public/uploads-blur/{name}")
        assert r.status_code == 404
    finally:
        await engine.dispose()


async def test_404_corrupt_original():
    import httpx
    from app.database import engine
    from app.main import app

    name = _valid_name()
    _write_bad(name)

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get(f"/api/public/uploads-blur/{name}")
        assert r.status_code == 404
        assert not os.path.exists(os.path.join(UPLOAD_DIR, ".blur", f"{name}.jpg"))
    finally:
        await engine.dispose()


def test_generate_blur_unit():
    """_generate_blur 单测：输出合法 JPEG、短边 ≈24px、无残留临时文件。"""
    import tempfile
    from pathlib import Path

    from PIL import Image
    from app.api.upload_blur import _generate_blur

    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "src.png"
        Image.new("RGB", (1280, 720), (200, 60, 60)).save(src, format="PNG")
        dst = Path(tmp) / "out.jpg"
        _generate_blur(src, dst)
        with Image.open(dst) as img:
            assert img.format == "JPEG"
            assert min(img.size) == 24
        # 无临时文件残留（只有 src.png 和 out.jpg）
        assert sorted(p.name for p in Path(tmp).iterdir()) == ["out.jpg", "src.png"]
