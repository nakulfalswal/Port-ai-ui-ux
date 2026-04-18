import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ── Hardcoded Demo Report ────────────────────────────────────
const DEMO_REPORT_TEXT = `
📊 PortAI — Daily Portfolio Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

🏦 Portfolio Summary
━━━━━━━━━━━━━━━━━━━
Total Portfolio Value: ₹12,45,800
Day P&L: +₹18,420 (+1.5%)
Overall Returns: +₹2,45,800 (+24.6%)

📈 Top Gainers Today
━━━━━━━━━━━━━━━━━━━
1. TCS — ₹4,280 (+3.2%) • BUY signal
2. HDFC Bank — ₹1,685 (+2.1%) • HOLD signal
3. Infosys — ₹1,890 (+1.8%) • HOLD signal

📉 Top Losers Today
━━━━━━━━━━━━━━━━━━━
1. Tata Motors — ₹920 (-1.4%) • HOLD signal
2. Wipro — ₹485 (-0.8%) • REDUCE signal

💼 Recent Transactions
━━━━━━━━━━━━━━━━━━━━━
• BOUGHT 10 shares of TCS @ ₹4,150 on 15 Apr
• SOLD 5 shares of ITC @ ₹465 on 14 Apr
• BOUGHT 20 shares of HDFC Bank @ ₹1,640 on 12 Apr

🤖 AI Recommendations
━━━━━━━━━━━━━━━━━━━━━
1. Consider adding more IT sector stocks — strong Q4 earnings expected
2. Book partial profits in Infosys above ₹1,900
3. Accumulate HDFC Bank on dips below ₹1,650
4. Avoid Wipro until turnaround signals appear

⚠️ Risk Alert
━━━━━━━━━━━━━
• Overall market PE ratio at 22.5x (above historical average)
• FII outflow of ₹2,300 Cr this week
• RBI policy review scheduled next week

📊 Powered by PortAI Intelligence Engine
🌐 portai.app
`.trim();

const DEMO_REPORT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #e5e5e5; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f1629, #0a0a0f); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: -1px; }
    .logo span { color: #4f8fff; }
    .subtitle { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }
    .section { margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
    .section-title { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; text-align: center; }
    .summary-item { padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
    .summary-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; }
    .summary-value { font-size: 20px; font-weight: 600; color: #fff; margin-top: 4px; }
    .gain { color: #10b981; }
    .loss { color: #ef4444; }
    .stock-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .stock-name { font-weight: 500; }
    .badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
    .badge-buy { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-hold { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .badge-sell { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-reduce { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: rgba(255,255,255,0.3); }
    .rec-item { padding: 10px; margin-bottom: 8px; background: rgba(79,143,255,0.05); border-left: 3px solid #4f8fff; border-radius: 0 8px 8px 0; font-size: 13px; }
    .alert-box { padding: 16px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; font-size: 13px; color: #fca5a5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Port<span>AI</span></div>
      <div class="subtitle">Daily Portfolio Report</div>
    </div>

    <div class="section">
      <div class="section-title">🏦 Portfolio Summary</div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Portfolio Value</div>
          <div class="summary-value">₹12.4L</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Day's P&L</div>
          <div class="summary-value gain">+₹18,420</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Overall Return</div>
          <div class="summary-value gain">+24.6%</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📈 Top Gainers</div>
      <div class="stock-row"><span class="stock-name">TCS</span> <span><span class="gain">₹4,280 (+3.2%)</span> <span class="badge badge-buy">BUY</span></span></div>
      <div class="stock-row"><span class="stock-name">HDFC Bank</span> <span><span class="gain">₹1,685 (+2.1%)</span> <span class="badge badge-hold">HOLD</span></span></div>
      <div class="stock-row"><span class="stock-name">Infosys</span> <span><span class="gain">₹1,890 (+1.8%)</span> <span class="badge badge-hold">HOLD</span></span></div>
    </div>

    <div class="section">
      <div class="section-title">📉 Top Losers</div>
      <div class="stock-row"><span class="stock-name">Tata Motors</span> <span><span class="loss">₹920 (-1.4%)</span> <span class="badge badge-hold">HOLD</span></span></div>
      <div class="stock-row"><span class="stock-name">Wipro</span> <span><span class="loss">₹485 (-0.8%)</span> <span class="badge badge-reduce">REDUCE</span></span></div>
    </div>

    <div class="section">
      <div class="section-title">💼 Recent Transactions</div>
      <div class="stock-row"><span>BOUGHT 10x TCS @ ₹4,150</span> <span style="color:rgba(255,255,255,0.4)">15 Apr</span></div>
      <div class="stock-row"><span>SOLD 5x ITC @ ₹465</span> <span style="color:rgba(255,255,255,0.4)">14 Apr</span></div>
      <div class="stock-row"><span>BOUGHT 20x HDFC Bank @ ₹1,640</span> <span style="color:rgba(255,255,255,0.4)">12 Apr</span></div>
    </div>

    <div class="section">
      <div class="section-title">🤖 AI Recommendations</div>
      <div class="rec-item">Consider adding more IT sector stocks — strong Q4 earnings expected</div>
      <div class="rec-item">Book partial profits in Infosys above ₹1,900</div>
      <div class="rec-item">Accumulate HDFC Bank on dips below ₹1,650</div>
      <div class="rec-item">Avoid Wipro until turnaround signals appear</div>
    </div>

    <div class="alert-box">
      ⚠️ <strong>Risk Alert:</strong> Market PE at 22.5x (above avg) • FII outflow ₹2,300 Cr this week • RBI policy review next week
    </div>

    <div class="footer">
      Powered by PortAI Intelligence Engine<br/>
      This is an automated report. Not financial advice.
    </div>
  </div>
</body>
</html>
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, phone, useDemo } = body;

    // Use hardcoded demo report
    const reportText = DEMO_REPORT_TEXT;
    const reportHtml = DEMO_REPORT_HTML;
    const subject = `📊 PortAI Daily Report — ${new Date().toLocaleDateString('en-IN')}`;

    // ── 1. Send Email via SMTP ──────────────────────────────
    let emailResult = null;
    if (to && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        emailResult = await transporter.sendMail({
          from: `"PortAI Reports" <${process.env.SMTP_EMAIL}>`,
          to,
          subject,
          html: reportHtml,
          text: reportText,
        });
        emailResult = { ok: true, messageId: emailResult.messageId };
      } catch (emailErr: any) {
        emailResult = { ok: false, error: emailErr.message };
      }
    } else if (to) {
      emailResult = { ok: false, error: 'SMTP credentials not configured in .env.local' };
    }

    // ── 2. Send WhatsApp via local server ────────────────────
    let whatsappResult = null;
    const waServer = process.env.NEXT_PUBLIC_WHATSAPP_SERVER || 'http://localhost:3500';
    if (phone) {
      try {
        const waRes = await fetch(`${waServer}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.replace(/\D/g, ''),
            message: reportText,
          }),
        });
        whatsappResult = await waRes.json();
      } catch (waErr: any) {
        whatsappResult = { ok: false, error: 'WhatsApp server not reachable. Start it: cd whatsapp-server && npm start, then scan QR at http://localhost:3500/qr' };
      }
    }

    return NextResponse.json({
      ok: true,
      email: emailResult,
      whatsapp: whatsappResult,
    });
  } catch (err: any) {
    console.error('Send report error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
