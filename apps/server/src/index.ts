import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import membersRouter from './routes/members'
import branchesRouter from './routes/branches'
import plansRouter from './routes/plans'
import statsRouter from './routes/stats'
import { startSubscriptionExpiryReminderJob } from './automations/subscriptionReminder.scheduler'

dotenv.config()

const app: Express = express()
const port = Number(process.env.PORT) || 3001

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())

app.get('/healthcheck', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' })
})

app.use('/members', membersRouter)
app.use('/branches', branchesRouter)
app.use('/plans', plansRouter)
app.use('/stats', statsRouter)

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'GymOS API running!' })
})

const host = '0.0.0.0'
app.listen(port, host, () => {
  console.log(`[server]: Server is running at http://${host}:${port}`)
})

startSubscriptionExpiryReminderJob()

export default app
