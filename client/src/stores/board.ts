import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { boardApi, taskApi } from '@/api'
import type { Board, BoardListItem, Task, Column } from '@/types'

export const useBoardStore = defineStore('board', () => {
  const boards = ref<BoardListItem[]>([])
  const currentBoard = ref<Board | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const columns = computed(() => {
    if (!currentBoard.value) return []
    return [...currentBoard.value.columns].sort((a, b) => a.order - b.order)
  })

  const tasksByColumn = computed(() => {
    const map: Record<string, Task[]> = {}
    if (!currentBoard.value) return map
    for (const col of currentBoard.value.columns) {
      map[col.id] = []
    }
    map['no-column'] = []
    for (const task of currentBoard.value.tasks) {
      const colId = task.columnId || 'no-column'
      if (!map[colId]) map[colId] = []
      map[colId].push(task)
    }
    Object.values(map).forEach((tasks) => tasks.sort((a, b) => a.position - b.position))
    return map
  })

  const taskCount = computed(() => currentBoard.value?.tasks.length || 0)

  const fetchBoards = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await boardApi.getAll()
      boards.value = res.data.data
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to fetch boards'
    } finally {
      loading.value = false
    }
  }

  const fetchBoard = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await boardApi.get(id)
      currentBoard.value = res.data.data
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to fetch board'
    } finally {
      loading.value = false
    }
  }

  const createBoard = async (data: { title: string; description?: string; color?: string; memberEmails?: string[] }) => {
    const res = await boardApi.create(data)
    await fetchBoards()
    return res.data.data
  }

  const updateBoard = async (id: string, data: { title?: string; description?: string; color?: string }) => {
    const res = await boardApi.update(id, data)
    if (currentBoard.value?.id === id) {
      currentBoard.value = { ...currentBoard.value, ...res.data.data }
    }
    await fetchBoards()
    return res.data
  }

  const deleteBoard = async (id: string) => {
    await boardApi.delete(id)
    boards.value = boards.value.filter((b) => b.id !== id)
    if (currentBoard.value?.id === id) currentBoard.value = null
  }

  const createTask = async (boardId: string, data: any) => {
    const res = await taskApi.create(boardId, data)
    const task = { ...res.data.data, comments: res.data.data.comments || [] }
    if (currentBoard.value?.id === boardId) {
      currentBoard.value.tasks.push(task)
    }
    return task
  }

  const updateTask = async (boardId: string, taskId: string, data: any) => {
    const res = await taskApi.update(boardId, taskId, data)
    if (currentBoard.value?.id === boardId) {
      const idx = currentBoard.value.tasks.findIndex((t) => t.id === taskId)
      if (idx !== -1) currentBoard.value.tasks[idx] = res.data.data
    }
    return res.data.data
  }

  const moveTask = async (boardId: string, taskId: string, columnId: string | null, position: number) => {
    await taskApi.move(boardId, taskId, { columnId, position })
  }

  const deleteTask = async (boardId: string, taskId: string) => {
    await taskApi.delete(boardId, taskId)
    if (currentBoard.value?.id === boardId) {
      currentBoard.value.tasks = currentBoard.value.tasks.filter((t) => t.id !== taskId)
    }
  }

  const addComment = async (boardId: string, taskId: string, content: string) => {
    const res = await taskApi.addComment(boardId, taskId, content)
    if (currentBoard.value?.id === boardId) {
      const task = currentBoard.value.tasks.find((t) => t.id === taskId)
      if (task) task.comments.unshift(res.data.data)
    }
    return res.data.data
  }

  const handleSocketTaskCreated = (task: Task) => {
    if (currentBoard.value?.id === task.boardId) {
      const exists = currentBoard.value.tasks.find((t) => t.id === task.id)
      if (!exists) currentBoard.value.tasks.push(task)
    }
  }

  const handleSocketTaskUpdated = (task: Task) => {
    if (currentBoard.value?.id === task.boardId) {
      const idx = currentBoard.value.tasks.findIndex((t) => t.id === task.id)
      if (idx !== -1) currentBoard.value.tasks[idx] = task
    }
  }

  const handleSocketTaskMoved = (data: { taskId: string; columnId: string | null; position: number; task: Task }) => {
    if (currentBoard.value?.id === data.task.boardId) {
      const idx = currentBoard.value.tasks.findIndex((t) => t.id === data.taskId)
      if (idx !== -1) {
        currentBoard.value.tasks[idx] = { ...currentBoard.value.tasks[idx], ...data.task }
      }
    }
  }

  const handleSocketTaskDeleted = (data: { taskId: string }) => {
    if (currentBoard.value) {
      currentBoard.value.tasks = currentBoard.value.tasks.filter((t) => t.id !== data.taskId)
    }
  }

  const handleSocketCommentAdded = (data: { taskId: string; comment: any }) => {
    if (currentBoard.value) {
      const task = currentBoard.value.tasks.find((t) => t.id === data.taskId)
      if (task) task.comments.unshift(data.comment)
    }
  }

  const addMember = async (boardId: string, email: string) => {
    await boardApi.addMember(boardId, email)
    await fetchBoard(boardId)
  }

  const removeMember = async (boardId: string, userId: string) => {
    await boardApi.removeMember(boardId, userId)
    await fetchBoard(boardId)
  }

  return {
    boards,
    currentBoard,
    loading,
    error,
    columns,
    tasksByColumn,
    taskCount,
    fetchBoards,
    fetchBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    addComment,
    addMember,
    removeMember,
    handleSocketTaskCreated,
    handleSocketTaskUpdated,
    handleSocketTaskMoved,
    handleSocketTaskDeleted,
    handleSocketCommentAdded,
  }
})
