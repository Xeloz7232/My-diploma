const os = require("os");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

async function convertDocxToPdf(inputBuffer) {
  const tmpDir = os.tmpdir();
  const tmpBase = `tmp-${Date.now()}`;
  const tmpDocx = path.join(tmpDir, `${tmpBase}.docx`);

  await fs.promises.writeFile(tmpDocx, inputBuffer);
  await new Promise((resolve, reject) => {
    const p = spawn("soffice", [
      "--headless","--invisible",
      "--convert-to","pdf:writer_pdf_Export",
      "--outdir", tmpDir,
      tmpDocx
    ], { shell: false, stdio: "ignore" });
    p.on("exit", code => code === 0 ? resolve() : reject(new Error("Conversion failed, code " + code)));
  });

  const tmpPdf = path.join(tmpDir, `${tmpBase}.pdf`);
  const pdf = await fs.promises.readFile(tmpPdf);
  await fs.promises.unlink(tmpDocx);
  await fs.promises.unlink(tmpPdf);

  return pdf;
}

module.exports = { convertDocxToPdf };
