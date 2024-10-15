const nodemailer = require("nodemailer")
const fs = require("fs")
const pug = require("pug")

const sendEmail = async options => {
    //1) Create a transporter (service that actually sends the email)
    const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "dbf47dbf445724",
          pass: "155f6265a8ed8b"
        }
      }); 

    //2)Define the email options

    // let htmlData = fs.readFileSync(`./pages/${options.html}.html`, "utf-8")
    let htmlData = pug.renderFile(`./views/${options.html}.pug`)
    const mailOptions = {
        from: "Akshat Vyas <vyasakshat123@gmail.com",
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: htmlData
    }

    //3) Actually send the email
    await transporter.sendMail(mailOptions)
}

module.exports = sendEmail