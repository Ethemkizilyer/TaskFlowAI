<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  FlexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/vue-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, Loader2 } from 'lucide-vue-next'

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

const props = withDefaults(defineProps<{
  data: any[]
  columns: ColumnDef<any, any>[]
  loading?: boolean
  pagination?: PaginationMeta | null
  serverSidePagination?: boolean
  pageSize?: number
}>(), {
  loading: false,
  pagination: null,
  serverSidePagination: false,
  pageSize: 10,
})

const emit = defineEmits<{
  'page-change': [page: number]
  'sort-change': [sort: { field: string; order: 'asc' | 'desc' }]
}>()

const sorting = ref<SortingState>([])

const table = useVueTable({
  get data() { return props.data },
  get columns() { return props.columns },
  state: {
    get sorting() { return sorting.value },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    if (sorting.value.length > 0) {
      emit('sort-change', {
        field: sorting.value[0].id,
        order: sorting.value[0].desc ? 'desc' : 'asc',
      })
    }
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: props.serverSidePagination ? undefined : getPaginationRowModel(),
  initialState: {
    pagination: { pageSize: props.pageSize },
  },
})

const currentPage = computed(() => {
  if (props.serverSidePagination && props.pagination) {
    return props.pagination.page
  }
  return table.getState().pagination.pageIndex + 1
})

const totalPages = computed(() => {
  if (props.serverSidePagination && props.pagination) {
    return props.pagination.totalPages
  }
  return Math.ceil(props.data.length / props.pageSize)
})

const totalItems = computed(() => {
  if (props.serverSidePagination && props.pagination) {
    return props.pagination.total
  }
  return props.data.length
})

const startItem = computed(() => {
  if (props.serverSidePagination && props.pagination) {
    return (props.pagination.page - 1) * props.pagination.limit + 1
  }
  return (currentPage.value - 1) * props.pageSize + 1
})

const endItem = computed(() => {
  if (props.serverSidePagination && props.pagination) {
    return Math.min(props.pagination.page * props.pagination.limit, props.pagination.total)
  }
  return Math.min(currentPage.value * props.pageSize, props.data.length)
})

function goToPage(page: number) {
  if (props.serverSidePagination) {
    emit('page-change', page)
  } else {
    table.setPageIndex(page - 1)
  }
}

function nextPage() {
  if (props.serverSidePagination) {
    if (props.pagination && props.pagination.page < props.pagination.totalPages) {
      emit('page-change', props.pagination.page + 1)
    }
  } else {
    table.nextPage()
  }
}

function prevPage() {
  if (props.serverSidePagination) {
    if (props.pagination && props.pagination.page > 1) {
      emit('page-change', props.pagination.page - 1)
    }
  } else {
    table.previousPage()
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Table -->
    <div class="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700">
      <table class="w-full text-sm">
        <thead class="bg-surface-50 dark:bg-surface-800/50">
          <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-300 whitespace-nowrap"
              :class="{ 'cursor-pointer select-none hover:bg-surface-100 dark:hover:bg-surface-800': header.column.getCanSort() }"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <div class="flex items-center gap-1">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                <span v-if="header.column.getIsSorted()" class="text-primary-500">
                  <ArrowUp v-if="header.column.getIsSorted() === 'asc'" :size="12" />
                  <ArrowDown v-else :size="12" />
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="py-12 text-center">
              <Loader2 :size="20" class="animate-spin text-primary-500 mx-auto" />
              <p class="text-surface-400 text-xs mt-2">Loading...</p>
            </td>
          </tr>
          <tr v-else-if="data.length === 0">
            <td :colspan="columns.length" class="py-12 text-center text-surface-400">
              No data found
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="row in (serverSidePagination ? data : table.getRowModel().rows)"
              :key="row.id"
              class="border-t border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="px-4 py-3 text-surface-700 dark:text-surface-200"
              >
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && data.length > 0" class="flex items-center justify-between mt-4 gap-4 flex-wrap">
      <p class="text-xs text-surface-400">
        Showing {{ startItem }}–{{ endItem }} of {{ totalItems }}
      </p>
      <div class="flex items-center gap-1">
        <button
          @click="goToPage(1)"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronsLeft :size="16" />
        </button>
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft :size="16" />
        </button>
        <span class="px-3 py-1 text-xs font-medium">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight :size="16" />
        </button>
        <button
          @click="goToPage(totalPages)"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronsRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>
