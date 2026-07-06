import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function sanitizeFilename(filename: string) {
  const cleaned = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned || "arquivo"}.pdf`;
}

async function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

async function createPdfFrame(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Não foi possível preparar o documento do PDF.");
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PDF</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          body {
            width: fit-content;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  doc.close();

  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }

  await waitForImages(doc);

  return iframe;
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const iframe = await createPdfFrame(element.outerHTML);

  try {
    const doc = iframe.contentDocument;
    const target = doc?.body.firstElementChild as HTMLElement | null;

    if (!doc || !target) {
      throw new Error("Não foi possível montar a ficha para exportação.");
    }

    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      windowWidth: Math.ceil(target.scrollWidth),
      windowHeight: Math.ceil(target.scrollHeight),
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(sanitizeFilename(filename));
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

export function printElement(
  element: HTMLElement,
  title: string,
  options?: { onAfterPrint?: () => void },
) {
  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  const handleAfterPrint = () => {
    options?.onAfterPrint?.();
    printWindow.close();
  };

  printWindow.addEventListener("afterprint", handleAfterPrint, { once: true });

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          body { padding: 24px; background: #fff; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
