# language: zh-CN
Feature: 后台管理
  管理员在后台完成赛事运营全流程：
  发布赛事、管理报名、录入发布成绩、导出数据、配置站点。

  Background:
    Given 管理员已在后台登录页输入正确账号密码并登录

  @A1
  Scenario: 查看报名列表
    Given 某赛事有选手报名
    When 管理员打开报名管理
    Then 列表中显示该报名（报名编号、姓名等）
    And 身份证号显示为脱敏值

  @A2
  Scenario: 导出报名数据
    Given 某赛事有选手报名
    When 管理员提交报名数据导出
    Then 导出任务完成
    And 下载的 Excel 中包含该报名记录
    And 导出的任务记录持久化（服务重启后仍可查询状态）

  @A3
  Scenario: 录入并发布成绩
    Given 某赛事有选手报名
    When 管理员为该报名录入分数和排名
    And 发布成绩
    Then 选手端可以查询到该成绩

  @A4
  Scenario: 编辑隐私政策
    When 管理员打开站点内容管理并编辑"隐私政策"
    And 保存
    Then 前台 /privacy 页面显示更新后的内容

  @A5
  Scenario: 修改系统设置
    When 管理员打开系统设置
    Then 显示三项以上保留期限配置（含默认值提示）
    When 管理员将导出文件保留天数改为 3 并保存
    Then 保存成功，设置生效

  @A6
  Scenario: 管理员修改自己的密码
    When 管理员在后台通过"修改密码"输入正确的原密码和合规新密码
    Then 修改成功
    And 新密码可以登录后台

  @A7
  Scenario: 弱密码无法创建管理员
    When 管理员创建新管理员账号并使用弱密码"aaaaaaaa"
    Then 创建被拒绝，提示密码复杂度要求

  @A8
  Scenario: 敏感自定义字段被拦截
    When 管理员为赛事添加名为"健康状况"的自定义报名字段
    Then 保存被拒绝，提示疑似收集敏感个人信息
