# language: zh-CN
Feature: 合规与安全
  系统内置的合规与安全机制，无需人工干预即应生效。

  @P1
  Scenario: 隐私政策页公开可访问
    When 访客打开首页
    Then 页脚包含"隐私政策"链接
    When 点击该链接
    Then 打开 /privacy 页面并显示隐私政策内容

  @P2
  Scenario: 关键操作留有审计日志
    When 发生以下任一行为：登录（成功或失败）、选手注册、导出数据、修改系统设置、注销账号
    Then 审计日志中记录操作者、时间、IP 与结果

  @P3
  Scenario: 接口返回的敏感信息一律脱敏
    When 任何接口返回选手数据
    Then 身份证号为脱敏形式（如 1101****7758）
    And 永不返回密码及其哈希

  @P4
  Scenario: 数据自动清理
    Given 系统每日执行清理任务
    Then 软删除超过 30 天的报名记录被物理清除（有成绩的除外）
    And 赛事结束超过 180 天的匿名报名身份证号被清除
    And 超过 1 天的导出文件被删除
    And 超过 183 天的审计日志 IP 被匿名化

  @P5
  Scenario: 日志只能新增不能删改
    When 任何人尝试修改或删除审计日志/同意记录
    Then 数据库拒绝该操作

  @P6
  Scenario: 页面以安全响应头发送
    When 浏览器请求任意页面
    Then 响应包含 X-Content-Type-Options、X-Frame-Options、Content-Security-Policy 等安全头

  @P7
  Scenario: 登录与注册接口有频率限制
    When 同一 IP 在 1 分钟内连续请求登录接口超过 10 次
    Then 后续请求返回 429
