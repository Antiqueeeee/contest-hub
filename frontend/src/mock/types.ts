export interface User {
  id: number
  username: string
  name: string
  phone: string
  status: 'active' | 'disabled'
  lastLoginAt: string
  createdAt: string
}

export interface NewsCategory {
  id: number
  name: string
  sortOrder: number
}

export interface News {
  id: number
  authorId: number
  categoryId: number
  title: string
  content: string
  coverImage: string
  isPinned: boolean
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Contest {
  id: number
  creatorId: number
  title: string
  description: string
  coverImage: string
  location: string
  startDate: string
  endDate: string
  registrationStart: string
  registrationEnd: string
  maxParticipants: number
  status: 'draft' | 'open' | 'ongoing' | 'finished' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface ContestGroup {
  id: number
  contestId: number
  name: string
  description: string
  maxParticipants: number
  sortOrder: number
}

export interface Award {
  id: number
  contestId: number
  name: string
  description: string
  sortOrder: number
}

export interface ContestField {
  id: number
  contestId: number
  fieldName: string
  fieldType: 'text' | 'number' | 'select' | 'date' | 'textarea'
  isRequired: boolean
  options: string[] | null
  sortOrder: number
}

export interface Registration {
  id: number
  contestId: number
  groupId: number | null
  registrationNumber: string
  formData: Record<string, string>
  submittedAt: string
}

export interface Result {
  id: number
  contestId: number
  registrationId: number
  scores: Record<string, number>
  totalScore: number
  rank: number | null
  awardId: number | null
  isPublished: boolean
  createdAt: string
}
