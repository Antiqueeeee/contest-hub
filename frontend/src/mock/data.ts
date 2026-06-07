import type { User, NewsCategory, News, Contest, ContestGroup, Award, ContestField, Registration, Result } from './types'

export const users: User[] = [
  { id: 1, username: 'admin', name: '系统管理员', phone: '13800000001', status: 'active', lastLoginAt: '2026-06-07 10:30:00', createdAt: '2026-01-01' },
  { id: 2, username: 'zhangsan', name: '张三', phone: '13800000002', status: 'active', lastLoginAt: '2026-06-06 15:20:00', createdAt: '2026-03-15' },
  { id: 3, username: 'lisi', name: '李四', phone: '13800000003', status: 'disabled', lastLoginAt: '2026-05-01 09:00:00', createdAt: '2026-02-20' },
]

export const newsCategories: NewsCategory[] = [
  { id: 1, name: '赛事通知', sortOrder: 1 },
  { id: 2, name: '行业动态', sortOrder: 2 },
  { id: 3, name: '获奖公告', sortOrder: 3 },
]

export const newsList: News[] = [
  { id: 1, authorId: 1, categoryId: 1, title: '2026年全国中学生数学竞赛报名通知', content: '<h2>竞赛简介</h2><p>2026年全国中学生数学竞赛将于7月15日正式启动报名。本次竞赛面向全国初中、高中在校学生，旨在激发学生对数学的兴趣，培养逻辑思维能力。</p><h3>参赛对象</h3><p>初中组：初一至初三在校学生</p><p>高中组：高一至高三在校学生</p><h3>比赛时间</h3><p>初赛：2026年9月10日</p><p>复赛：2026年10月15日</p><p>决赛：2026年11月20日</p>', coverImage: '', isPinned: true, status: 'published', publishedAt: '2026-06-01 09:00:00', createdAt: '2026-06-01', updatedAt: '2026-06-01' },
  { id: 2, authorId: 1, categoryId: 1, title: '关于调整英语演讲比赛时间的紧急通知', content: '<p>受场地安排影响，原定于8月10日举办的英语演讲比赛调整为8月17日举行，请各位参赛选手做好相应准备。</p>', coverImage: '', isPinned: true, status: 'published', publishedAt: '2026-06-03 14:00:00', createdAt: '2026-06-03', updatedAt: '2026-06-03' },
  { id: 3, authorId: 1, categoryId: 2, title: '教育部发布2026年竞赛活动白名单', content: '<p>教育部近日发布了2026年度面向中小学生的全国性竞赛活动白名单，共包含36项竞赛。</p>', coverImage: '', isPinned: false, status: 'published', publishedAt: '2026-05-20 10:00:00', createdAt: '2026-05-20', updatedAt: '2026-05-20' },
  { id: 4, authorId: 2, categoryId: 3, title: '2026年春季编程大赛获奖名单公布', content: '<p>经过激烈角逐，2026年春季编程大赛获奖名单正式公布，恭喜所有获奖选手！</p>', coverImage: '', isPinned: false, status: 'published', publishedAt: '2026-05-15 16:00:00', createdAt: '2026-05-15', updatedAt: '2026-05-15' },
  { id: 5, authorId: 1, categoryId: 1, title: '物理竞赛赛前培训安排', content: '<p>为帮助参赛选手更好地准备即将到来的物理竞赛，组委会安排了为期两天的赛前培训。</p>', coverImage: '', isPinned: false, status: 'draft', publishedAt: null, createdAt: '2026-06-05', updatedAt: '2026-06-05' },
  { id: 6, authorId: 2, categoryId: 2, title: '人工智能竞赛成为新趋势', content: '<p>随着AI技术的快速发展，人工智能相关竞赛逐渐成为各大高校和企业关注的焦点。</p>', coverImage: '', isPinned: false, status: 'draft', publishedAt: null, createdAt: '2026-06-06', updatedAt: '2026-06-06' },
  { id: 7, authorId: 1, categoryId: 3, title: '2025年度优秀竞赛指导教师表彰', content: '<p>表彰在2025年度竞赛指导工作中表现突出的教师。</p>', coverImage: '', isPinned: false, status: 'archived', publishedAt: '2026-01-10 08:00:00', createdAt: '2026-01-10', updatedAt: '2026-01-10' },
  { id: 8, authorId: 2, categoryId: 1, title: '化学竞赛实验环节注意事项', content: '<p>参加化学竞赛实验环节的选手请注意以下安全事项...</p>', coverImage: '', isPinned: false, status: 'archived', publishedAt: '2026-02-20 10:00:00', createdAt: '2026-02-20', updatedAt: '2026-02-20' },
]

export const contestGroups: ContestGroup[] = [
  { id: 1, contestId: 1, name: '小学组', description: '1-6年级在校学生', maxParticipants: 100, sortOrder: 1 },
  { id: 2, contestId: 1, name: '中学组', description: '7-12年级在校学生', maxParticipants: 150, sortOrder: 2 },
  { id: 3, contestId: 2, name: '初级组', description: '编程经验 < 1年', maxParticipants: 50, sortOrder: 1 },
  { id: 4, contestId: 2, name: '高级组', description: '编程经验 ≥ 1年', maxParticipants: 50, sortOrder: 2 },
  { id: 5, contestId: 3, name: 'A组', description: '低年级组', maxParticipants: 80, sortOrder: 1 },
  { id: 6, contestId: 3, name: 'B组', description: '高年级组', maxParticipants: 80, sortOrder: 2 },
  { id: 7, contestId: 4, name: '公开组', description: '不限年龄', maxParticipants: 200, sortOrder: 1 },
]

export const awards: Award[] = [
  { id: 1, contestId: 1, name: '一等奖', description: '总分前5%', sortOrder: 1 },
  { id: 2, contestId: 1, name: '二等奖', description: '总分前15%', sortOrder: 2 },
  { id: 3, contestId: 1, name: '三等奖', description: '总分前30%', sortOrder: 3 },
  { id: 4, contestId: 1, name: '优秀奖', description: '入围决赛', sortOrder: 4 },
  { id: 5, contestId: 2, name: '金奖', description: '第一名', sortOrder: 1 },
  { id: 6, contestId: 2, name: '银奖', description: '第二名', sortOrder: 2 },
  { id: 7, contestId: 2, name: '铜奖', description: '第三名', sortOrder: 3 },
  { id: 8, contestId: 3, name: '一等奖', description: '', sortOrder: 1 },
  { id: 9, contestId: 3, name: '二等奖', description: '', sortOrder: 2 },
  { id: 10, contestId: 4, name: '冠军', description: '', sortOrder: 1 },
  { id: 11, contestId: 4, name: '亚军', description: '', sortOrder: 2 },
  { id: 12, contestId: 4, name: '季军', description: '', sortOrder: 3 },
]

export const contestFields: ContestField[] = [
  { id: 1, contestId: 1, fieldName: '学校名称', fieldType: 'text', isRequired: true, options: null, sortOrder: 1 },
  { id: 2, contestId: 1, fieldName: '指导老师', fieldType: 'text', isRequired: false, options: null, sortOrder: 2 },
  { id: 3, contestId: 2, fieldName: 'GitHub 主页', fieldType: 'text', isRequired: false, options: null, sortOrder: 1 },
  { id: 4, contestId: 2, fieldName: '编程语言', fieldType: 'select', isRequired: true, options: ['Python', 'Java', 'C++', 'JavaScript', 'Go'], sortOrder: 2 },
  { id: 5, contestId: 3, fieldName: '身份证号', fieldType: 'text', isRequired: true, options: null, sortOrder: 1 },
  { id: 6, contestId: 4, fieldName: '所属单位', fieldType: 'text', isRequired: true, options: null, sortOrder: 1 },
]

export const contests: Contest[] = [
  {
    id: 1, creatorId: 1, title: '2026年全国中学生数学竞赛',
    description: '<p><strong>全国中学生数学竞赛</strong>是由中国数学会主办的全国性学科竞赛活动。</p><p>本竞赛旨在激发中学生学习数学的兴趣，培养数学思维能力，选拔优秀数学人才。</p><p>竞赛分为初赛、复赛、决赛三个阶段，覆盖代数、几何、数论、组合数学等多个领域。</p>',
    coverImage: '', location: '各赛区指定考点',
    startDate: '2026-09-10', endDate: '2026-11-20',
    registrationStart: '2026-06-01T00:00', registrationEnd: '2026-08-31T23:59',
    maxParticipants: 500, status: 'open',
    createdAt: '2026-05-01', updatedAt: '2026-06-01',
  },
  {
    id: 2, creatorId: 1, title: '2026春季编程挑战赛',
    description: '<p>面向全国高校学生的编程竞赛，考察算法设计与编程实现能力。</p>',
    coverImage: '', location: '线上',
    startDate: '2026-07-01', endDate: '2026-07-03',
    registrationStart: '2026-05-01T00:00', registrationEnd: '2026-06-30T23:59',
    maxParticipants: 200, status: 'ongoing',
    createdAt: '2026-04-01', updatedAt: '2026-05-01',
  },
  {
    id: 3, creatorId: 2, title: '第五届校园英语演讲大赛',
    description: '<p>培养学生英语表达能力和演讲技巧的校级竞赛。</p>',
    coverImage: '', location: '学校报告厅',
    startDate: '2026-08-10', endDate: '2026-08-10',
    registrationStart: '2026-06-15T00:00', registrationEnd: '2026-08-05T23:59',
    maxParticipants: 100, status: 'draft',
    createdAt: '2026-06-01', updatedAt: '2026-06-01',
  },
  {
    id: 4, creatorId: 1, title: '2025年度科创作品评选大赛',
    description: '<p>科技创新作品评选已圆满结束，获奖名单已公布。</p>',
    coverImage: '', location: '市科技馆',
    startDate: '2025-10-01', endDate: '2025-12-15',
    registrationStart: '2025-08-01T00:00', registrationEnd: '2025-09-30T23:59',
    maxParticipants: 300, status: 'finished',
    createdAt: '2025-07-01', updatedAt: '2025-12-20',
  },
]

function genRegNumber(contestId: number, index: number): string {
  const cid = String(contestId).padStart(3, '0')
  const seq = String(index).padStart(4, '0')
  return `C${cid}-20260606-${seq}`
}

export const registrations: Registration[] = [
  { id: 1, contestId: 1, groupId: 1, registrationNumber: genRegNumber(1, 1), formData: { name: '王小明', phone: '13900001001', 学校名称: '第一小学', 指导老师: '陈老师' }, submittedAt: '2026-06-02 10:00:00' },
  { id: 2, contestId: 1, groupId: 1, registrationNumber: genRegNumber(1, 2), formData: { name: '李小红', phone: '13900001002', 学校名称: '实验小学', 指导老师: '刘老师' }, submittedAt: '2026-06-02 11:00:00' },
  { id: 3, contestId: 1, groupId: 1, registrationNumber: genRegNumber(1, 3), formData: { name: '张大伟', phone: '13900001003', 学校名称: '第二小学', 指导老师: '' }, submittedAt: '2026-06-02 12:00:00' },
  { id: 4, contestId: 1, groupId: 2, registrationNumber: genRegNumber(1, 4), formData: { name: '赵晓丽', phone: '13900001004', 学校名称: '第一中学', 指导老师: '王老师' }, submittedAt: '2026-06-02 13:00:00' },
  { id: 5, contestId: 1, groupId: 2, registrationNumber: genRegNumber(1, 5), formData: { name: '孙志强', phone: '13900001005', 学校名称: '实验中学', 指导老师: '李老师' }, submittedAt: '2026-06-02 14:00:00' },
  { id: 6, contestId: 1, groupId: 2, registrationNumber: genRegNumber(1, 6), formData: { name: '周美玲', phone: '13900001006', 学校名称: '第二中学', 指导老师: '' }, submittedAt: '2026-06-02 15:00:00' },
  { id: 7, contestId: 1, groupId: 1, registrationNumber: genRegNumber(1, 7), formData: { name: '吴建华', phone: '13900001007', 学校名称: '第三小学', 指导老师: '张老师' }, submittedAt: '2026-06-03 09:00:00' },
  { id: 8, contestId: 1, groupId: 2, registrationNumber: genRegNumber(1, 8), formData: { name: '郑国强', phone: '13900001008', 学校名称: '外国语中学', 指导老师: '赵老师' }, submittedAt: '2026-06-03 10:00:00' },
  { id: 9, contestId: 1, groupId: 1, registrationNumber: genRegNumber(1, 9), formData: { name: '冯雪莹', phone: '13900001009', 学校名称: '阳光小学', 指导老师: '' }, submittedAt: '2026-06-03 11:00:00' },
  { id: 10, contestId: 1, groupId: 2, registrationNumber: genRegNumber(1, 10), formData: { name: '陈博文', phone: '13900001010', 学校名称: '师大附中', 指导老师: '刘老师' }, submittedAt: '2026-06-03 12:00:00' },
  { id: 11, contestId: 2, groupId: 3, registrationNumber: genRegNumber(2, 1), formData: { name: '刘德华', phone: '13900002001', 编程语言: 'Python' }, submittedAt: '2026-05-10 09:00:00' },
  { id: 12, contestId: 2, groupId: 3, registrationNumber: genRegNumber(2, 2), formData: { name: '林志玲', phone: '13900002002', 编程语言: 'Java' }, submittedAt: '2026-05-11 10:00:00' },
  { id: 13, contestId: 2, groupId: 4, registrationNumber: genRegNumber(2, 3), formData: { name: '周杰伦', phone: '13900002003', 编程语言: 'C++' }, submittedAt: '2026-05-12 11:00:00' },
  { id: 14, contestId: 2, groupId: 4, registrationNumber: genRegNumber(2, 4), formData: { name: '蔡依林', phone: '13900002004', 编程语言: 'Go' }, submittedAt: '2026-05-13 12:00:00' },
  { id: 15, contestId: 2, groupId: 3, registrationNumber: genRegNumber(2, 5), formData: { name: '张学友', phone: '13900002005', 编程语言: 'JavaScript' }, submittedAt: '2026-05-14 13:00:00' },
  { id: 16, contestId: 4, groupId: 7, registrationNumber: genRegNumber(4, 1), formData: { name: '钱学森', phone: '13900004001', 所属单位: '中国科学院' }, submittedAt: '2025-08-10 09:00:00' },
  { id: 17, contestId: 4, groupId: 7, registrationNumber: genRegNumber(4, 2), formData: { name: '邓稼先', phone: '13900004002', 所属单位: '北京大学' }, submittedAt: '2025-08-11 10:00:00' },
  { id: 18, contestId: 4, groupId: 7, registrationNumber: genRegNumber(4, 3), formData: { name: '袁隆平', phone: '13900004003', 所属单位: '农业科学院' }, submittedAt: '2025-08-12 11:00:00' },
  { id: 19, contestId: 4, groupId: 7, registrationNumber: genRegNumber(4, 4), formData: { name: '屠呦呦', phone: '13900004004', 所属单位: '中医药大学' }, submittedAt: '2025-08-13 12:00:00' },
  { id: 20, contestId: 4, groupId: 7, registrationNumber: genRegNumber(4, 5), formData: { name: '钟南山', phone: '13900004005', 所属单位: '医科大学' }, submittedAt: '2025-08-14 13:00:00' },
]

export const results: Result[] = [
  { id: 1, contestId: 4, registrationId: 16, scores: { 客观题得分: 92, 主观题得分: 85 }, totalScore: 177, rank: 1, awardId: 10, isPublished: true, createdAt: '2025-12-16' },
  { id: 2, contestId: 4, registrationId: 17, scores: { 客观题得分: 88, 主观题得分: 82 }, totalScore: 170, rank: 2, awardId: 11, isPublished: true, createdAt: '2025-12-16' },
  { id: 3, contestId: 4, registrationId: 18, scores: { 客观题得分: 85, 主观题得分: 80 }, totalScore: 165, rank: 3, awardId: 12, isPublished: true, createdAt: '2025-12-16' },
  { id: 4, contestId: 4, registrationId: 19, scores: { 客观题得分: 80, 主观题得分: 78 }, totalScore: 158, rank: 4, awardId: null, isPublished: true, createdAt: '2025-12-16' },
  { id: 5, contestId: 4, registrationId: 20, scores: { 客观题得分: 76, 主观题得分: 75 }, totalScore: 151, rank: 5, awardId: null, isPublished: false, createdAt: '2025-12-16' },
]

export function getContestGroups(contestId: number) { return contestGroups.filter(g => g.contestId === contestId) }
export function getAwards(contestId: number) { return awards.filter(a => a.contestId === contestId) }
export function getContestFields(contestId: number) { return contestFields.filter(f => f.contestId === contestId) }
export function getRegistrations(contestId: number) { return registrations.filter(r => r.contestId === contestId) }
export function getResults(contestId: number) { return results.filter(r => r.contestId === contestId) }
export function getNewsCategoryName(id: number) { return newsCategories.find(c => c.id === id)?.name ?? '未知' }
export function getContestTitle(id: number) { return contests.find(c => c.id === id)?.title ?? '未知赛事' }
export function getGroupName(contestId: number, groupId: number | null) {
  if (!groupId) return '未分组'
  return contestGroups.find(g => g.id === groupId)?.name ?? '未知组别'
}
export function getAwardName(id: number | null) {
  if (!id) return '无'
  return awards.find(a => a.id === id)?.name ?? '未知'
}
export function getUserName(id: number) { return users.find(u => u.id === id)?.name ?? '未知' }
export function getRegistrationById(id: number) { return registrations.find(r => r.id === id) }
