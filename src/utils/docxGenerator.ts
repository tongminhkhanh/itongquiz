import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { Quiz, QuestionType } from "../types";

export const generateQuizDocx = async (quiz: Quiz) => {
    const children: any[] = [];

    // Title
    children.push(
        new Paragraph({
            text: quiz.title,
            heading: 'Title',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    // Subtitle (Topic & Class)
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Chủ đề: ${quiz.topic} - Lớp: ${quiz.classLevel}`,
                    bold: true,
                    size: 24,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    // Questions
    for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        const questionNumber = i + 1;

        // Question Text
        const questionText = (q as any).question || (q as any).mainQuestion || '';
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Câu ${questionNumber}: `,
                        bold: true,
                    }),
                    new TextRun({
                        text: questionText,
                    }),
                ],
                spacing: { before: 200, after: 100 },
            })
        );

        // Handle Image (if URL is valid)
        if ((q as any).image && !(q as any).image.includes('placehold.co')) {
            try {
                const response = await fetch((q as any).image);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();

                children.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: buffer,
                                transformation: {
                                    width: 300,
                                    height: 200,
                                },
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    })
                );
            } catch (e) {
                console.warn('Could not embed image:', e);
            }
        }

        // Handle Options based on type
        switch (q.type) {
            case QuestionType.MCQ:
            case QuestionType.MULTIPLE_SELECT:
            case QuestionType.IMAGE_QUESTION:
                const options = (q as any).options || [];
                // Create a table for options (2 columns if possible)
                const rows = [];
                for (let j = 0; j < options.length; j += 2) {
                    const cells = [];
                    // Option 1
                    cells.push(createOptionCell(options[j], j));

                    // Option 2 (if exists)
                    if (j + 1 < options.length) {
                        cells.push(createOptionCell(options[j + 1], j + 1));
                    } else {
                        cells.push(new TableCell({ children: [] })); // Empty cell filler
                    }

                    rows.push(new TableRow({ children: cells }));
                }

                children.push(
                    new Table({
                        rows: rows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                            insideHorizontal: { style: BorderStyle.NONE },
                            insideVertical: { style: BorderStyle.NONE },
                        },
                    })
                );
                break;

            case QuestionType.TRUE_FALSE:
                const items = (q as any).items || [];
                const tfRows = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Nội dung", bold: true })], width: { size: 70, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ text: "Đúng", bold: true, alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ text: "Sai", bold: true, alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                        ]
                    })
                ];

                items.forEach((item: any) => {
                    tfRows.push(
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(item.statement || '')] }),
                                new TableCell({ children: [] }), // Checkbox placeholder
                                new TableCell({ children: [] }), // Checkbox placeholder
                            ]
                        })
                    );
                });

                children.push(
                    new Table({
                        rows: tfRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    })
                );
                break;

            case QuestionType.MATCHING:
                const pairs = (q as any).pairs || [];
                const matchRows = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Cột A", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Cột B", bold: true })] }),
                        ]
                    })
                ];

                pairs.forEach((pair: any) => {
                    matchRows.push(
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(pair.left || '')] }),
                                new TableCell({ children: [new Paragraph(pair.right || '')] }),
                            ]
                        })
                    );
                });

                children.push(
                    new Table({
                        rows: matchRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    })
                );
                break;

            case QuestionType.SHORT_ANSWER:
                children.push(
                    new Paragraph({
                        text: "Trả lời: .................................................................................................",
                        spacing: { before: 100 },
                    })
                );
                break;
        }

        children.push(new Paragraph({ text: "" })); // Spacing
    }

    // Generate
    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${quiz.title || 'quiz'}.docx`);
};

const createOptionCell = (text: string, index: number) => {
    const letter = String.fromCharCode(65 + index);
    // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
    const cleanText = (text || '').replace(/^[A-Da-d][.)]\s*/, '');
    return new TableCell({
        children: [
            new Paragraph({
                children: [
                    new TextRun({ text: `${letter}. `, bold: true }),
                    new TextRun({ text: cleanText }),
                ],
            }),
        ],
        width: { size: 50, type: WidthType.PERCENTAGE },
    });
};
