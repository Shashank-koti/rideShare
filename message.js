require("dotenv").config();
const twilio = require("twilio");

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendWhatsAppMessage = async (to, message) => {
    try {
      const response = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER, // Your Twilio WhatsApp number
        to: `whatsapp:+91${to}`, // Recipient's WhatsApp number
        body: message,
      });
    } catch (error) {
      console.error("❌ Error sending WhatsApp message:", error.message);
    }
  };

// Export the function
module.exports = sendWhatsAppMessage;
