import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { LettreBuiltContent, LettreChambreGroupe, LettreParticipantLine } from "@/lib/letters/letter-types";
import { LETTER_FOOTER_LINES } from "@/lib/letters/letter-content";

function boldNomLine(p: LettreParticipantLine): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "- ", size: 22 }),
      new TextRun({ text: p.nom.toUpperCase(), bold: true, size: 22, font: "Times New Roman" }),
      new TextRun({ text: ` ${p.prenom}`, size: 22, font: "Times New Roman" }),
    ],
    spacing: { after: 80 },
    indent: { left: 360 },
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, size: 22, font: "Times New Roman" })],
  });
}

function sectionTitleUnderlined(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        underline: {},
        size: 22,
        font: "Times New Roman",
      }),
    ],
  });
}

function objetParagraph(objet: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [
      new TextRun({
        text: `Objet : ${objet}`,
        bold: true,
        underline: {},
        size: 22,
        font: "Times New Roman",
      }),
    ],
  });
}

function chambreGroupeParagraphs(groupe: LettreChambreGroupe): Paragraph[] {
  return [sectionTitleUnderlined(groupe.title), ...groupe.participants.map(boldNomLine)];
}

function listeParticipantsParagraphs(content: LettreBuiltContent): Paragraph[] {
  const out: Paragraph[] = [];
  if (content.joueurs.length > 0) {
    out.push(sectionTitleUnderlined("Joueurs et joueuses :"));
    for (const p of content.joueurs) out.push(boldNomLine(p));
  }
  if (content.coachs.length > 0) {
    out.push(sectionTitleUnderlined("Staff technique :"));
    for (const p of content.coachs) out.push(boldNomLine(p));
  }
  return out;
}

function buildLogoHeader(logoBuffer?: Buffer | null): Header {
  if (!logoBuffer?.length) {
    return new Header({ children: [] });
  }
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 95, height: 55 },
            type: "png",
          }),
        ],
      }),
    ],
  });
}

function buildFooter(): Footer {
  const green = "006233";
  const children: Paragraph[] = [];
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: LETTER_FOOTER_LINES.casablanca.label, bold: true, size: 14, color: green }),
      ],
    })
  );
  for (const line of LETTER_FOOTER_LINES.casablanca.lines) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 14, font: "Arial", color: "333333" })],
      })
    );
  }
  children.push(
    new Paragraph({
      spacing: { before: 120 },
      children: [
        new TextRun({ text: LETTER_FOOTER_LINES.rabat.label, bold: true, size: 14, color: green }),
      ],
    })
  );
  for (const line of LETTER_FOOTER_LINES.rabat.lines) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 14, font: "Arial", color: "333333" })],
      })
    );
  }
  return new Footer({ children });
}

function buildSignatureCachetRow(
  content: LettreBuiltContent,
  cachetBuffer?: Buffer | null,
  cachetFormat: "PNG" | "JPEG" = "JPEG"
): Table {
  const cachetChildren: Paragraph[] = cachetBuffer?.length
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: cachetBuffer,
              transformation: { width: 145, height: 132 },
              type: cachetFormat === "JPEG" ? "jpg" : "png",
            }),
          ],
        }),
      ]
    : [];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        height: { value: 3400, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            children: cachetChildren,
          }),
          new TableCell({
            width: { size: 62, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: content.signatureTitle,
                    size: 22,
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: content.signatureName,
                    bold: true,
                    size: 24,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function generateLettreDocx(
  content: LettreBuiltContent,
  logoBuffer?: Buffer | null,
  cachetBuffer?: Buffer | null,
  cachetFormat: "PNG" | "JPEG" = "JPEG"
): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: content.dateLettre, size: 22, font: "Times New Roman" })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: content.destinataireLigne,
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
      spacing: { after: 240 },
    }),
    objetParagraph(content.objet),
    bodyParagraph("Monsieur,"),
  ];

  for (const para of content.introParagraphs) {
    children.push(bodyParagraph(para));
  }

  if (content.mode === "hebergement_complet") {
    if (content.hebergementRepartitionIntro) {
      children.push(bodyParagraph(content.hebergementRepartitionIntro));
    }
    if (content.chambreGroupes.length > 0) {
      for (const g of content.chambreGroupes) {
        children.push(...chambreGroupeParagraphs(g));
      }
    } else {
      children.push(...listeParticipantsParagraphs(content));
    }
  } else {
    children.push(...listeParticipantsParagraphs(content));
    if (content.hebergementCoachParagraph) {
      children.push(bodyParagraph(content.hebergementCoachParagraph));
    }
  }

  for (const para of content.closingParagraphs) {
    children.push(bodyParagraph(para));
  }

  children.push(
    new Paragraph({ spacing: { before: 520 } }),
    buildSignatureCachetRow(content, cachetBuffer, cachetFormat)
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 1134, bottom: 1800, left: 1134 },
            borders: {
              pageBorderTop: { style: BorderStyle.SINGLE, size: 8, color: "006233", space: 8 },
              pageBorderBottom: { style: BorderStyle.SINGLE, size: 8, color: "006233", space: 8 },
              pageBorderLeft: { style: BorderStyle.SINGLE, size: 10, color: "CC0000", space: 12 },
              pageBorderRight: { style: BorderStyle.SINGLE, size: 10, color: "CC0000", space: 12 },
            },
          },
        },
        headers: { default: buildLogoHeader(logoBuffer) },
        footers: { default: buildFooter() },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
