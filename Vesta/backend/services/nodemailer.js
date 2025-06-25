const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport(
  {
    host: process.env.SMTP,
    port: 465,
    secure: true,
    auth: {
      user: process.env.DEFAULT_EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  },
  {
    from: `Сервисный центр <${process.env.DEFAULT_EMAIL}>`,
  }
);

const mailer = (message) => {
  transporter.sendMail(message, (err, info) => {
    if (err) return console.log(err);
    console.log("Письмо отправлено: ", info);
  });
};

module.exports = mailer;
