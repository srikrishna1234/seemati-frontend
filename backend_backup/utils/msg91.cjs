// backend/src/utils/msg91.cjs
const axios = require("axios");

const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/";

async function sendOtpViaMsg91({ mobile, otp, flowId, sender, authkey }) {
  const payload = {
    flow_id: flowId,       // MSG91 template/flow ID
    sender,                // DLT Header: SEMATY
    mobiles: `91${mobile}`,// Include country code
    OTP: otp,              // <-- variable name must match your MSG91 template variable {{OTP}}
  };

  const headers = {
    authkey: authkey,
    "Content-Type": "application/json",
  };

  const res = await axios.post(MSG91_FLOW_URL, payload, { headers });
  return res.data;
}

module.exports = { sendOtpViaMsg91 };
