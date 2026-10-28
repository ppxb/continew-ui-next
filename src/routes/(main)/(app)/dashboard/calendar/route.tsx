import { createFileRoute } from '@tanstack/react-router'

import { Calendar } from './-components/calendar'

export const Route = createFileRoute('/(main)/(app)/dashboard/calendar')({
  component: Page
})

function Page() {
  return <Calendar />
}
