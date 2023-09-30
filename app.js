const express = require('express')
const nodemailer = require('nodemailer')
const bodyParser = require('body-parser')
require('dotenv').config() // Load environment variables from .env file
const cors = require('cors') // Import the cors packa

const app = express()
app.use(cors())
const port = 3000

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.send('Hello, Express!')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

app.post('/send-email', (req, res) => {
  console.log('asdasd', req.body)
  const { name, email, message } = req.body

  const beautifulString = req.body
    .map(item => `${item.Attribute}: ${item.Value}`)
    .join('\n')
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'mbbsadmissionsinabroad@gmail.com',
    subject: 'New Form Submission',
    text: beautifulString
  }
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email', error)
      res.status(500).send({ message: 'Error sending email' })
    } else {
      console.log('Email sent: ' + info.response)
      res.status(200).send({ message: 'Email sent successfully' })
    }
  })
})
