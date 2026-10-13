import packageJson from '../../package.json'

const currentYear = new Date().getFullYear()

export const APP_CONFIG = {
  name: 'Continew Admin',
  version: packageJson.version,
  copyright: `© ${currentYear}, Continew Admin.`,
  meta: {
    title: 'Continew Admin - Modern TanStack Start Dashboard Starter Template',
    description:
      'Continew Admin is a modern, open-source dashboard starter template built with TanStack Start, Tailwind CSS v4, and shadcn/ui. Perfect for SaaS apps, admin panels, and internal tools—fully customizable and production-ready.'
  }
}
