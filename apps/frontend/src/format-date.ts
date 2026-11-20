export const formatDateTime = (date: string, style: 'short' | 'medium' = 'short') =>
  new Intl.DateTimeFormat(undefined, { dateStyle: style, timeStyle: 'short' }).format(new Date(date))
