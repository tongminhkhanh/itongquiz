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

        // Question Text with optional difficulty level
        const questionText = (q as any).question || (q as any).mainQuestion || '';
        const difficulty = (q as any).difficulty as (1 | 2 | 3 | undefined);
        const difficultyLabel = difficulty ? ` (Mức ${difficulty})` : '';

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Câu ${questionNumber}${difficultyLabel}: `,
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

            case QuestionType.DRAG_DROP:
                // Show blanks and word bank
                const ddBlanks = (q as any).blanks || [];
                const ddDistractors = (q as any).distractors || [];
                const allWords = [...ddBlanks, ...ddDistractors].sort(() => Math.random() - 0.5);

                // Word bank
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Từ cho sẵn: ", bold: true }),
                            new TextRun({ text: allWords.join(" / ") }),
                        ],
                        spacing: { before: 100 },
                    })
                );

                // Text with blanks (replace blanks with underlines)
                const ddText = (q as any).text || '';
                const displayText = ddText.replace(/\[([^\]]+)\]/g, '____');
                children.push(
                    new Paragraph({
                        text: displayText,
                        spacing: { before: 100 },
                    })
                );
                break;

            case QuestionType.DROPDOWN:
                // Show text with blanks
                const dropText = (q as any).text || '';
                const dropBlanks = (q as any).blanks || [];

                // Replace [1], [2] with blank lines
                const dropDisplay = dropText.replace(/\[\d+\]/g, '____');
                children.push(
                    new Paragraph({
                        text: dropDisplay,
                        spacing: { before: 100 },
                    })
                );

                // Show options for each blank
                dropBlanks.forEach((blank: any, idx: number) => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `[${idx + 1}]: `, bold: true }),
                                new TextRun({ text: (blank.options || []).join(" / ") }),
                            ],
                            spacing: { before: 50 },
                        })
                    );
                });
                break;

            case QuestionType.ORDERING:
                // Show items to order
                const orderItems = (q as any).items || [];
                orderItems.forEach((item: string, idx: number) => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `(${idx + 1}) `, bold: true }),
                                new TextRun({ text: item }),
                            ],
                            spacing: { before: 50 },
                        })
                    );
                });

                children.push(
                    new Paragraph({
                        text: "Thứ tự đúng: .................................",
                        spacing: { before: 100 },
                    })
                );
                break;

            case QuestionType.UNDERLINE:
                // Show sentence with words
                const sentence = (q as any).sentence || '';
                children.push(
                    new Paragraph({
                        text: sentence,
                        spacing: { before: 100 },
                    })
                );
                break;

            case QuestionType.CATEGORIZATION:
                // Show categories and items
                const categories = (q as any).categories || [];
                const catItems = (q as any).items || [];

                // List categories
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Các nhóm: ", bold: true }),
                            new TextRun({ text: categories.map((c: any) => c.name).join(" | ") }),
                        ],
                        spacing: { before: 100 },
                    })
                );

                // List items to categorize
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Các mục cần phân loại: ", bold: true }),
                        ],
                        spacing: { before: 100 },
                    })
                );

                catItems.forEach((item: any, idx: number) => {
                    children.push(
                        new Paragraph({
                            text: `${idx + 1}. ${item.content}`,
                            spacing: { before: 50 },
                        })
                    );
                });
                break;

            case QuestionType.WORD_SCRAMBLE:
                // Show scrambled letters
                const letters = (q as any).letters || [];
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Các chữ: ", bold: true }),
                            new TextRun({ text: letters.join(" - ") }),
                        ],
                        spacing: { before: 100 },
                    })
                );

                children.push(
                    new Paragraph({
                        text: "Từ đúng: .................................",
                        spacing: { before: 100 },
                    })
                );
                break;

            case QuestionType.RIDDLE:
                // Show riddle lines
                const riddleLines = (q as any).riddleLines || [];
                riddleLines.forEach((line: string) => {
                    children.push(
                        new Paragraph({
                            text: line,
                            spacing: { before: 50 },
                        })
                    );
                });

                const answerLabel = (q as any).answerLabel || 'Trả lời';
                children.push(
                    new Paragraph({
                        text: `${answerLabel}: ................................`,
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
