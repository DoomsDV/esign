import { useEffect } from 'react'

const APP_NAME = 'Etick'

export function formatPageTitle(page: string) {
  return `${page} | ${APP_NAME}`
}

export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = formatPageTitle(page)
  }, [page])
}
