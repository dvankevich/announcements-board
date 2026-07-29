// src/logger.ts
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

// console.log(process.env.NODE_ENV)
// console.log("isDev: ", isDev)


const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
    },
  }),
})

export default logger
