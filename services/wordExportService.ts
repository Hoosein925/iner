import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak
} from 'docx';

/**
 * Converts markdown formatted text to docx Paragraphs and real docx Tables with proper styling and RTL alignment.
 */
function parseMarkdownToDocxElements(md: string): (Paragraph | Table)[] {
  const lines = md.split('\n');
  const elements: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      elements.push(
        new Paragraph({
          text: '',
          spacing: { after: 80 },
        })
      );
      i++;
      continue;
    }

    // Table detection: lines starting with '|' and ending with '|'
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());

        // Skip divider row (row 1)
        const dataRows = tableLines.slice(2).map(r =>
          r
            .split('|')
            .slice(1, -1)
            .map(c => c.trim())
        );

        const headerRow = new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: headerCells.map(h => new TableCell({
            shading: { type: ShadingType.CLEAR, fill: '1E3A8A' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '1E3A8A' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A8A' },
              left: { style: BorderStyle.SINGLE, size: 2, color: '3B82F6' },
              right: { style: BorderStyle.SINGLE, size: 2, color: '3B82F6' },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: h.replace(/\*\*/g, ''),
                    bold: true,
                    size: 20,
                    color: 'FFFFFF',
                    rightToLeft: true,
                    font: 'Vazirmatn',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 80, after: 80 },
              }),
            ],
          })),
        });

        const docxDataRows = dataRows.map((row, rIdx) =>
          new TableRow({
            cantSplit: true,
            children: row.map(cell => new TableCell({
              shading: rIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : { type: ShadingType.CLEAR, fill: 'FFFFFF' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
                left: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
                right: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
              },
              children: [
                new Paragraph({
                  children: parseInlineFormatting(cell),
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  spacing: { before: 60, after: 60 },
                }),
              ],
            })),
          })
        );

        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...docxDataRows],
          })
        );
        elements.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        continue;
      }
    }

    // Heading 1: # Title
    if (line.startsWith('# ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace('# ', ''),
              bold: true,
              size: 32, // 16pt
              color: '1e3a8a',
              rightToLeft: true,
              font: 'Vazirmatn',
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 240, after: 120 },
        })
      );
    }
    // Heading 2: ## Section
    else if (line.startsWith('## ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace('## ', ''),
              bold: true,
              size: 26, // 13pt
              color: '0f766e',
              rightToLeft: true,
              font: 'Vazirmatn',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 200, after: 100 },
        })
      );
    }
    // Heading 3: ### Subsection
    else if (line.startsWith('### ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace('### ', ''),
              bold: true,
              size: 24, // 12pt
              color: '334155',
              rightToLeft: true,
              font: 'Vazirmatn',
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 160, after: 80 },
        })
      );
    }
    // Blockquote or note: > Note
    else if (line.startsWith('> ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '📌 ' + line.replace('> ', ''),
              italics: true,
              size: 21,
              color: '475569',
              rightToLeft: true,
              font: 'Vazirmatn',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 80, after: 80 },
          indent: { right: 360 },
        })
      );
    }
    // Bullet item: - or *
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.substring(2);
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(text, '• '),
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 70 },
          indent: { right: 280 },
        })
      );
    }
    // Numbered item: 1. 2. etc.
    else if (/^\d+\.\s/.test(line)) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(line),
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 70 },
          indent: { right: 280 },
        })
      );
    }
    // Horizontal rule: ---
    else if (line === '---' || line === '***') {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '________________________________________________________',
              color: 'cbd5e1',
              size: 18,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
        })
      );
    }
    // Regular paragraph
    else {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(line),
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 90 },
        })
      );
    }

    i++;
  }

  return elements;
}

/**
 * Backward compatible alias for parsing markdown
 */
function parseMarkdownToDocxParagraphs(md: string): (Paragraph | Table)[] {
  return parseMarkdownToDocxElements(md);
}

/**
 * Parses bold text (**text**) and returns TextRun elements with proper RTL and styling.
 */
function parseInlineFormatting(text: string, prefix = ''): TextRun[] {
  const runs: TextRun[] = [];
  if (prefix) {
    runs.push(
      new TextRun({
        text: prefix,
        bold: true,
        size: 22,
        color: '0f766e',
        rightToLeft: true,
        font: 'Vazirmatn',
      })
    );
  }

  const parts = text.split(/(\*\*.*?\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          size: 22,
          color: '0f172a',
          rightToLeft: true,
          font: 'Vazirmatn',
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          size: 22,
          color: '334155',
          rightToLeft: true,
          font: 'Vazirmatn',
        })
      );
    }
  }

  return runs;
}

/**
 * Triggers file download in browser.
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Creates the official Sign-off and Approval Table (Section 10)
 */
function createOfficialSignOffTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'سرپرستار بخش', bold: true, size: 20, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'سوپروایزر آموزشی', bold: true, size: 20, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'مدیر خدمات پرستاری (مترون)', bold: true, size: 20, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'رئیس / مدیر بیمارستان', bold: true, size: 20, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'نام و امضا:\n\n\n\nتاریخ:', size: 18, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'نام و امضا:\n\n\n\nتاریخ:', size: 18, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'نام و امضا:\n\n\n\nتاریخ:', size: 18, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'نام و امضا:\n\n\n\nتاریخ:', size: 18, font: 'Vazirmatn', rightToLeft: true }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates the official Cover Page (Section 1)
 */
function createOfficialCoverPage(params: {
  hospitalName: string;
  departmentName: string;
  title: string;
  dateStr: string;
}): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'جمهوری اسلامی ایران',
          size: 22,
          color: '475569',
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 400, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'وزارت بهداشت، درمان و آموزش پزشکی - معاونت درمان',
          size: 24,
          color: '334155',
          bold: true,
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `مرکز آموزشی، پژوهشی و درمانی ${params.hospitalName}`,
          size: 28,
          color: '1E3A8A',
          bold: true,
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '═════════════════════════════════════════════',
          color: '3B82F6',
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'گزارش جامع تحلیل ارزیابی مهارت‌های عملکردی پرستاری',
          size: 34,
          bold: true,
          color: '1E3A8A',
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 140 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'و برنامه جامع اقدامات اصلاحی و بهبود مستمر بالینی',
          size: 26,
          color: '0F766E',
          bold: true,
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `بخش هدف: ${params.departmentName}`,
          size: 24,
          bold: true,
          color: '0F172A',
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `عنوان سند: ${params.title}`,
          size: 22,
          color: '334155',
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `تاریخ صدور: ${params.dateStr} | مرجع: هوش مصنوعی سامانه اعتباربخشی و آموزش بیمارستان`,
          size: 20,
          color: '64748B',
          rightToLeft: true,
          font: 'Vazirmatn',
        }),
      ],
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 500 },
    }),
    new Paragraph({
      children: [
        new PageBreak(),
      ],
    }),
  ];
}

/**
 * Export Comprehensive 10-Section Official Word Report (.docx)
 */
export async function exportPeriodicPlanToDocx(params: {
  title: string;
  targetName: string;
  departmentName: string;
  roleDescription: string;
  overallAvg?: number;
  content: string;
  activeYear?: number;
  hospitalName?: string;
}) {
  const currentDateFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date());
  const hName = params.hospitalName || 'بیمارستان';

  const coverElements = createOfficialCoverPage({
    hospitalName: hName,
    departmentName: params.departmentName,
    title: params.title,
    dateStr: currentDateFa,
  });

  const bodyElements = parseMarkdownToDocxElements(params.content);
  const signOffTable = createOfficialSignOffTable();

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...coverElements,
          ...bodyElements,
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: '## ۱۰. صفحه تأیید و امضای مسئولین و کادر مدیریت بالینی',
                bold: true,
                size: 26,
                color: '0f766e',
                rightToLeft: true,
                font: 'Vazirmatn',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'این سند پس از تحلیل سیستمی و ممیزی میدانی، به تأیید مقامات ذی‌صلاح بیمارستان می‌رسد و اجرای مفاد آن برای کلیه شیفت‌ها الزامی است:',
                size: 20,
                color: '475569',
                rightToLeft: true,
                font: 'Vazirmatn',
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 120 },
          }),
          signOffTable,
          new Paragraph({ text: '', spacing: { after: 150 } }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTargetName = params.targetName.replace(/[\\/:*?"<>| ]/g, '_');
  const filename = `گزارش_جامع_تحلیل_مهارت_${cleanTargetName}.docx`;
  triggerBrowserDownload(blob, filename);
}

/**
 * Export Skill Training & Guideline Education to Word (.docx)
 */
export async function exportSkillTrainingToDocx(params: {
  skillName: string;
  categoryName: string;
  departmentName: string;
  staffName?: string;
  currentScore?: number;
  maxScore?: number;
  content: string;
}) {
  const currentDateFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date());

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F0FDF4' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
              right: { style: BorderStyle.SINGLE, size: 14, color: '16A34A' },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'طرح درس و راهنمای آموزش بالینی مهارت (هوش مصنوعی)',
                    bold: true,
                    size: 26,
                    color: '166534',
                    rightToLeft: true,
                    font: 'Vazirmatn',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 100, after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `نام مهارت: ${params.skillName}`,
                    bold: true,
                    size: 24,
                    color: '0F172A',
                    rightToLeft: true,
                    font: 'Vazirmatn',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `دسته مهارتی: ${params.categoryName} | بخش: ${params.departmentName}${params.staffName ? ` | پرسنل: ${params.staffName}` : ''} | تاریخ: ${currentDateFa}`,
                    size: 20,
                    color: '334155',
                    rightToLeft: true,
                    font: 'Vazirmatn',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'سامانه ارزیابی عملکرد، بهبود مستمر و توانمندسازی بالینی کادر پرستاری',
                    italics: true,
                    size: 18,
                    color: '15803D',
                    rightToLeft: true,
                    font: 'Vazirmatn',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { after: 100 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const bodyElements = parseMarkdownToDocxElements(params.content);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: '', spacing: { after: 100 } }),
          headerTable,
          new Paragraph({ text: '', spacing: { after: 150 } }),
          ...bodyElements,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanSkillName = params.skillName.replace(/[\\/:*?"<>| ]/g, '_').substring(0, 30);
  const filename = `برنامه_و_آموزش_مهارت_${cleanSkillName}.docx`;
  triggerBrowserDownload(blob, filename);
}

