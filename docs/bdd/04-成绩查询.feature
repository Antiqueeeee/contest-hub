# language: zh-CN
Feature: 成绩查询
  管理员发布成绩后，选手可以自助查询，无需联系工作人员。

  @S1
  Scenario: 查看已发布的成绩
    Given 选手已报名某赛事
    And 管理员已为该报名录入成绩并发布
    When 选手登录并打开个人中心"我的成绩"
    Then 显示该赛事的分数、排名和奖项

  @S2
  Scenario: 成绩未发布时不可见
    Given 选手已报名某赛事
    And 管理员已录入成绩但未发布
    When 选手查看"我的成绩"
    Then 不显示该赛事的成绩
