import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
// Route imports
import userRoutes from './routes/user.routes'
import jobRoutes from './routes/job.routes'
import membershipRoutes from './routes/membership.routes'
import couponRoutes from './routes/coupon.routes'
import applicationRoutes from './routes/application.routes'
import adminRoutes from './routes/admin.routes'
import analyticsRoutes from './routes/analytics.routes'
import contentRoutes from './routes/content.routes'
import authRoutes from './routes/auth.routes'
import cashfreeRoutes from './routes/cashfree.routes'
import contactRoutes from './routes/contact.routes'
import leadsRoutes from './routes/leads.routes'
import otpRoutes from './routes/otp.routes'
import filesRoutes from './routes/files.routes'
import digioRoutes from './routes/digio.routes'
import mailChimpRoutes from './routes/mailchimp.routes'
import recommendationRoutes from './routes/recommendation.routes'
import settingsRoutes from './routes/settings.routes'
import scratchPadRoutes from './routes/scratchpad.routes'
import { startSubscriptionExpiryReminderJob } from './automations/subscriptionReminder.scheduler'
import webinarRegistrationsRoutes from './routes/webinar-registrations.routes'
import redFlagsRoutes from './routes/red-flags.routes'
import staffRoutes from './routes/staff.routes'
import qnaRoutes from './routes/qna.routes'
import subscriptionWhatsappRoutes from './routes/subscription-whatsapp.routes'

dotenv.config()

const app: Express = express()
const port = Number(process.env.PORT) || 3001

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
  })
)
app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf?.toString?.()
    },
  })
)
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())

// Healthcheck endpoint
app.get('/healthcheck', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/cashfree', cashfreeRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api', userRoutes)
app.use('/api', jobRoutes)
app.use('/api', applicationRoutes)
app.use('/api', membershipRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/content', contentRoutes)
app.use('/api/mailchimp', mailChimpRoutes)
app.use('/api', contactRoutes)
app.use('/api', leadsRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/digio', digioRoutes)
app.use('/api', recommendationRoutes)
app.use('/api', settingsRoutes)
app.use('/api', scratchPadRoutes)
app.use('/api', webinarRegistrationsRoutes)
app.use('/api', redFlagsRoutes)
app.use('/api', staffRoutes)
app.use('/api', qnaRoutes)
app.use('/api', subscriptionWhatsappRoutes)

app.set('trust proxy', 1) // if you use secure cookies or rely on req.protocol

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res
    .status(200)
    .json({ status: 'ok', message: 'Express + TypeScript Server running!' })
})

const host = '0.0.0.0'
app.listen(port, host, () => {
  console.log(`[server]: Server is running at http://${host}:${port}`)
})

startSubscriptionExpiryReminderJob()

export default app
