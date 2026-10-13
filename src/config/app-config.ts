import packageJson from '../../package.json'

const currentYear = new Date().getFullYear()

export const APP_CONFIG = {
  name: 'Continew Admin',
  version: packageJson.version,
  copyright: `© ${currentYear}, Continew Admin.`
}
