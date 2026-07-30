const PDFDocument = require('pdfkit');

const DARK_BG   = { r: 5,   g: 5,   b: 16  };
const GOLD      = { r: 201, g: 162, b: 39  };
const GOLD_DIM  = { r: 143, g: 116, b: 32  };
const PAPER     = { r: 239, g: 233, b: 216 };
const PAPER2    = { r: 228, g: 220, b: 196 };
const INK       = { r: 18,  g: 20,  b: 15  };
const TEAL      = { r: 63,  g: 125, b: 114 };
const WHITE     = { r: 255, g: 255, b: 255 };
const LIGHT_TXT = { r: 200, g: 195, b: 180 };

function rgb(c) { return [c.r, c.g, c.b]; }

function generatePDF(mind, personName) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595.28;
    const H = 841.89;
    const PAD = 40;

    function fill(x, y, w, h, c) {
      doc.rect(x, y, w, h).fill(`rgb(${c.r},${c.g},${c.b})`);
    }

    function bar(x, y, w, value, label, barColor) {
      // bg
      doc.rect(x, y, w, 6).fill('rgb(40,40,55)');
      // fill
      doc.rect(x, y, w * value / 100, 6).fill(`rgb(${barColor.r},${barColor.g},${barColor.b})`);
      // label
      doc.font('Helvetica').fontSize(8).fill(`rgb(${LIGHT_TXT.r},${LIGHT_TXT.g},${LIGHT_TXT.b})`)
        .text(label, x, y - 10, { width: w / 2, align: 'left', lineBreak: false });
      doc.fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
        .text(`${value}%`, x + w / 2, y - 10, { width: w / 2, align: 'right', lineBreak: false });
    }

    // ═══ PAGE 1: DARK COVER ═══
    doc.addPage();
    fill(0, 0, W, H, DARK_BG);

    // Header label
    doc.font('Helvetica-Bold').fontSize(8).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('QUIZ MENTES BRILHANTES  .  RELATORIO EXCLUSIVO', 0, 22, { align: 'center', width: W });

    doc.moveTo(40, 34).lineTo(W - 40, 34).stroke(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`);

    // Icon circle
    doc.circle(W / 2, 88, 36)
      .fillAndStroke('rgb(20,20,40)', `rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);

    // Icon text inside circle
    doc.font('Helvetica-Bold').fontSize(12).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text(mind.name.split(' ').pop().substring(0, 7).toUpperCase(), W / 2 - 30, 80, { width: 60, align: 'center' });

    // Name
    doc.font('Helvetica-Bold').fontSize(28).fill(`rgb(${WHITE.r},${WHITE.g},${WHITE.b})`)
      .text(mind.name, 0, 138, { align: 'center', width: W });

    doc.font('Helvetica').fontSize(12).fill(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`)
      .text(mind.years, 0, 172, { align: 'center', width: W });

    doc.moveTo(W / 2 - 40, 192).lineTo(W / 2 + 40, 192)
      .stroke(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);

    if (personName) {
      doc.font('Helvetica').fontSize(9).fill(`rgb(${LIGHT_TXT.r},${LIGHT_TXT.g},${LIGHT_TXT.b})`)
        .text(`PERFIL DE ${personName.toUpperCase()}`, 0, 198, { align: 'center', width: W });
    }

    // Bars
    let by = 225;
    const bx = 50, bw = W - 100;
    for (const [label, value] of Object.entries(mind.attrs)) {
      bar(bx, by, bw, value, label, GOLD);
      by += 28;
    }

    // Traits
    let tx = bx;
    by += 10;
    for (const trait of mind.traits) {
      const tw = trait.length * 6 + 16;
      doc.rect(tx, by, tw, 14).fill('rgb(40,35,20)');
      doc.font('Helvetica-Bold').fontSize(7).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
        .text(trait.toUpperCase(), tx, by + 3, { width: tw, align: 'center', lineBreak: false });
      tx += tw + 8;
    }

    // Quote
    by += 28;
    doc.font('Helvetica-Oblique').fontSize(10).fill(`rgb(${LIGHT_TXT.r},${LIGHT_TXT.g},${LIGHT_TXT.b})`)
      .text(`"${mind.quote}"`, PAD, by, { width: W - PAD * 2, align: 'center' });

    // Footer
    doc.font('Helvetica').fontSize(7).fill('rgb(80,80,100)')
      .text('quizmentes.vercel.app  .  Analise personalizada baseada no seu perfil de resposta', 0, H - 20, { align: 'center', width: W });

    // ═══ PAGE 2: PRAISE ═══
    doc.addPage();
    fill(0, 0, W, H, PAPER);
    fill(0, 0, W, 50, INK);

    doc.font('Helvetica').fontSize(8).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('QUIZ MENTES BRILHANTES', 0, 14, { align: 'center', width: W });
    doc.font('Helvetica-Bold').fontSize(15).fill(`rgb(${WHITE.r},${WHITE.g},${WHITE.b})`)
      .text(`Voce pensa como ${mind.name}`, 0, 26, { align: 'center', width: W });

    doc.moveTo(PAD, 56).lineTo(W - PAD, 56).stroke(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`);

    let y = 66;
    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('O QUE ISSO DIZ SOBRE VOCE', PAD, y);
    y += 14;

    doc.font('Helvetica-Oblique').fontSize(11).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.praise, PAD, y, { width: W - PAD * 2 });
    y = doc.y + 12;

    doc.moveTo(PAD, y).lineTo(W - PAD, y).stroke(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);
    y += 10;

    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('COMO VOCE PENSA', PAD, y);
    y += 14;

    doc.font('Helvetica').fontSize(10).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.desc, PAD, y, { width: W - PAD * 2 });
    y = doc.y + 12;

    doc.moveTo(PAD, y).lineTo(W - PAD, y).stroke(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);
    y += 10;

    tx = PAD;
    for (const trait of mind.traits) {
      const tw = trait.length * 6 + 16;
      doc.rect(tx, y, tw, 14).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`);
      doc.font('Helvetica-Bold').fontSize(7).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
        .text(trait.toUpperCase(), tx, y + 3, { width: tw, align: 'center', lineBreak: false });
      tx += tw + 8;
    }

    doc.font('Helvetica').fontSize(7).fill('rgb(120,115,100)')
      .text('Pagina 2 de 4  .  quizmentes.vercel.app', 0, H - 20, { align: 'center', width: W });

    // ═══ PAGE 3: BIO ═══
    doc.addPage();
    fill(0, 0, W, H, PAPER);
    fill(0, 0, W, 50, INK);

    doc.font('Helvetica').fontSize(8).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('CONTEXTO HISTORICO', 0, 14, { align: 'center', width: W });
    doc.font('Helvetica-Bold').fontSize(15).fill(`rgb(${WHITE.r},${WHITE.g},${WHITE.b})`)
      .text(mind.name, 0, 26, { align: 'center', width: W });

    doc.moveTo(PAD, 56).lineTo(W - PAD, 56).stroke(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`);

    y = 66;
    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('QUEM FOI', PAD, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.bio, PAD, y, { width: W - PAD * 2 });
    y = doc.y + 12;

    doc.moveTo(PAD, y).lineTo(W - PAD, y).stroke(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);
    y += 10;

    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('PRINCIPAIS DESCOBERTAS', PAD, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.discovery, PAD, y, { width: W - PAD * 2 });
    y = doc.y + 12;

    // Quote block
    doc.rect(PAD, y, W - PAD * 2, 42).fill(`rgb(${INK.r},${INK.g},${INK.b})`);
    doc.font('Helvetica-Oblique').fontSize(10).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text(`"${mind.quote}"`, PAD + 12, y + 8, { width: W - PAD * 2 - 24 });
    doc.font('Helvetica').fontSize(8).fill(`rgb(${LIGHT_TXT.r},${LIGHT_TXT.g},${LIGHT_TXT.b})`)
      .text(`- ${mind.name}`, PAD + 12, y + 30, { width: W - PAD * 2 - 24 });
    y += 54;

    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('NO MUNDO ATUAL', PAD, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.today, PAD, y, { width: W - PAD * 2 });

    doc.font('Helvetica').fontSize(7).fill('rgb(120,115,100)')
      .text('Pagina 3 de 4  .  quizmentes.vercel.app', 0, H - 20, { align: 'center', width: W });

    // ═══ PAGE 4: POTENTIAL ═══
    doc.addPage();
    fill(0, 0, W, H, PAPER);
    fill(0, 0, W, 50, INK);

    doc.font('Helvetica').fontSize(8).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('SEU POTENCIAL', 0, 14, { align: 'center', width: W });
    doc.font('Helvetica-Bold').fontSize(15).fill(`rgb(${WHITE.r},${WHITE.g},${WHITE.b})`)
      .text('Onde voce pode ir', 0, 26, { align: 'center', width: W });

    doc.moveTo(PAD, 56).lineTo(W - PAD, 56).stroke(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`);

    y = 66;
    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('ONDE VOCE SE DESTACA', PAD, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.strengths, PAD, y, { width: W - PAD * 2 });
    y = doc.y + 12;

    doc.moveTo(PAD, y).lineTo(W - PAD, y).stroke(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);
    y += 10;

    // Two columns
    const colW = (W - PAD * 2 - 20) / 2;

    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${TEAL.r},${TEAL.g},${TEAL.b})`)
      .text('CARREIRAS', PAD, y);
    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('AREAS DE ESTUDO', PAD + colW + 20, y);
    y += 14;

    const startY = y;
    let cy = startY, sy = startY;

    for (const career of mind.careers) {
      doc.circle(PAD + 4, cy + 4, 2).fill(`rgb(${TEAL.r},${TEAL.g},${TEAL.b})`);
      doc.font('Helvetica').fontSize(9).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
        .text(career, PAD + 12, cy, { width: colW - 12, lineBreak: false });
      cy += 14;
    }

    for (const area of mind.study) {
      doc.circle(PAD + colW + 24, sy + 4, 2).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`);
      doc.font('Helvetica').fontSize(9).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
        .text(area, PAD + colW + 32, sy, { width: colW - 12, lineBreak: false });
      sy += 14;
    }

    y = Math.max(cy, sy) + 12;
    doc.moveTo(PAD, y).lineTo(W - PAD, y).stroke(`rgb(${GOLD_DIM.r},${GOLD_DIM.g},${GOLD_DIM.b})`);
    y += 10;

    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('MENTES COMPLEMENTARES A SUA', PAD, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).fill(`rgb(${INK.r},${INK.g},${INK.b})`)
      .text(mind.complementary.join('  .  '), PAD, y);
    y += 28;

    // CTA
    doc.rect(PAD, y, W - PAD * 2, 36).fill(`rgb(${INK.r},${INK.g},${INK.b})`);
    doc.font('Helvetica-Bold').fontSize(9).fill(`rgb(${GOLD.r},${GOLD.g},${GOLD.b})`)
      .text('Compartilhe seu resultado:', PAD, y + 6, { width: W - PAD * 2, align: 'center' });
    doc.font('Helvetica').fontSize(9).fill(`rgb(${LIGHT_TXT.r},${LIGHT_TXT.g},${LIGHT_TXT.b})`)
      .text('quizmentes.vercel.app', PAD, y + 20, { width: W - PAD * 2, align: 'center' });

    doc.font('Helvetica').fontSize(7).fill('rgb(120,115,100)')
      .text('Pagina 4 de 4  .  quizmentes.vercel.app  .  Relatorio gerado exclusivamente para voce', 0, H - 20, { align: 'center', width: W });

    doc.end();
  });
}

module.exports = { generatePDF };
