import * as XLSX from 'xlsx';

// File parsing utilities
export interface StudentData {
    name: string;
    email: string;
    studentId: string;
    classId: string;
    dateOfBirth: string;
}

export const parseExcelFile = async (file: File): Promise<StudentData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    reject(new Error('Không thể đọc file'));
                    return;
                }

                // Parse Excel file using xlsx library
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                console.log('Excel data preview:', jsonData.slice(0, 15)); // Debug: show first 15 rows

                // Find the header row (usually around row 9-10 based on the image)
                let headerRowIndex = -1;
                let studentIdCol = -1;
                let nameCol = -1;
                let dateOfBirthCol = -1;

                // Look for header row containing "Mã Sinh viên", "Họ và Tên", "Ngày sinh"
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];
                    if (row && row.length > 0) {
                        for (let j = 0; j < row.length; j++) {
                            const cell = row[j];
                            if (typeof cell === 'string') {
                                if (cell.includes('Mã Sinh viên') || cell.includes('Mã SV')) {
                                    studentIdCol = j;
                                }
                                if (cell.includes('Họ và Tên') || cell.includes('Họ tên')) {
                                    nameCol = j;
                                }
                                if (cell.includes('Ngày sinh')) {
                                    dateOfBirthCol = j;
                                }
                            }
                        }

                        // If we found all required columns, this is our header row
                        if (studentIdCol !== -1 && nameCol !== -1 && dateOfBirthCol !== -1) {
                            headerRowIndex = i;
                            break;
                        }
                    }
                }

                if (headerRowIndex === -1) {
                    console.log('Header search failed. Available columns:', jsonData.slice(0, 10));
                    reject(new Error('Không tìm thấy header phù hợp trong file Excel. Vui lòng kiểm tra file có đúng format bảng điểm không.'));
                    return;
                }

                console.log(`Found header at row ${headerRowIndex}, columns: studentId=${studentIdCol}, name=${nameCol}, dateOfBirth=${dateOfBirthCol}`);

                const students: StudentData[] = [];

                // Process data rows starting from headerRowIndex + 1
                for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];
                    if (!row || row.length === 0) continue;

                    const studentId = row[studentIdCol];
                    const name = row[nameCol];
                    const dateOfBirth = row[dateOfBirthCol];

                    // Skip empty rows or rows without student ID
                    if (!studentId || !name || studentId === '' || name === '') continue;

                    // Create email from student ID (MSV)
                    const emailFromMSV = studentId.toString().trim().toLowerCase();

                    // Format date of birth (handle DD/MM/YYYY format)
                    let formattedDate = '2005-01-01';
                    if (dateOfBirth) {
                        if (typeof dateOfBirth === 'string' && dateOfBirth.includes('/')) {
                            const parts = dateOfBirth.split('/');
                            if (parts.length === 3) {
                                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                        } else if (dateOfBirth instanceof Date) {
                            formattedDate = dateOfBirth.toISOString().split('T')[0];
                        }
                    }

                    students.push({
                        name: name.toString().trim(),
                        email: `${emailFromMSV}@ictu.edu.vn`,
                        studentId: studentId.toString().trim(),
                        classId: 'K22.CNTTQT.K2.D1.01', // Default class or extract from file
                        dateOfBirth: formattedDate
                    });
                }

                if (students.length === 0) {
                    console.log('No students found. Processed rows:', jsonData.slice(headerRowIndex + 1, headerRowIndex + 10));
                    reject(new Error('Không tìm thấy dữ liệu sinh viên trong file. Vui lòng kiểm tra dữ liệu sau header.'));
                    return;
                }

                console.log(`Successfully parsed ${students.length} students:`, students.slice(0, 3));
                resolve(students);
            } catch (error) {
                console.error('Excel parsing error:', error);
                reject(new Error('Lỗi khi xử lý file Excel: ' + (error as Error).message));
            }
        };

        reader.onerror = () => {
            reject(new Error('Không thể đọc file'));
        };

        reader.readAsArrayBuffer(file);
    });
};

export const parseCSVFile = async (file: File): Promise<StudentData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const csvText = e.target?.result as string;
                if (!csvText) {
                    reject(new Error('Không thể đọc file CSV'));
                    return;
                }

                const lines = csvText.split('\n');
                const students: StudentData[] = [];

                // Find header row
                let headerRowIndex = -1;
                let studentIdCol = -1;
                let nameCol = -1;
                let dateOfBirthCol = -1;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const columns = line.split(',');
                    for (let j = 0; j < columns.length; j++) {
                        const cell = columns[j].trim();
                        if (cell.includes('Mã Sinh viên') || cell.includes('Mã SV')) {
                            studentIdCol = j;
                        }
                        if (cell.includes('Họ và Tên') || cell.includes('Họ tên')) {
                            nameCol = j;
                        }
                        if (cell.includes('Ngày sinh')) {
                            dateOfBirthCol = j;
                        }
                    }

                    if (studentIdCol !== -1 && nameCol !== -1 && dateOfBirthCol !== -1) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    reject(new Error('Không tìm thấy header phù hợp trong file CSV'));
                    return;
                }

                // Process data rows
                for (let i = headerRowIndex + 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const columns = line.split(',');
                    if (columns.length < Math.max(studentIdCol, nameCol, dateOfBirthCol) + 1) continue;

                    const studentId = columns[studentIdCol]?.trim();
                    const name = columns[nameCol]?.trim();
                    const dateOfBirth = columns[dateOfBirthCol]?.trim();

                    if (studentId && name) {
                        // Tạo email từ mã sinh viên (MSV)
                        const emailFromMSV = studentId.trim().toLowerCase();

                        // Format date of birth
                        let formattedDate = '2005-01-01';
                        if (dateOfBirth && dateOfBirth.includes('/')) {
                            const parts = dateOfBirth.split('/');
                            if (parts.length === 3) {
                                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                        }

                        students.push({
                            name: name,
                            email: `${emailFromMSV}@ictu.edu.vn`,
                            studentId: studentId,
                            classId: 'K22.CNTTQT.K2.D1.01',
                            dateOfBirth: formattedDate
                        });
                    }
                }

                if (students.length === 0) {
                    reject(new Error('Không tìm thấy dữ liệu sinh viên trong file CSV'));
                    return;
                }

                resolve(students);
            } catch (error) {
                console.error('CSV parsing error:', error);
                reject(new Error('Lỗi khi xử lý file CSV: ' + (error as Error).message));
            }
        };

        reader.onerror = () => {
            reject(new Error('Không thể đọc file CSV'));
        };

        reader.readAsText(file);
    });
};

export const parsePDFFile = async (file: File): Promise<StudentData[]> => {
    // TODO: Implement PDF parsing with pdf-parse or similar library
    // Hiện tại là mock data dựa trên bảng điểm thực tế với email format MSV
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    name: 'Phạm Nguyên An',
                    email: 'dtc235340001@ictu.edu.vn',
                    studentId: 'DTC235340001',
                    classId: 'K22.CNTTQT.K2.D1.01',
                    dateOfBirth: '2005-08-11'
                },
                {
                    name: 'Hoàng Mạnh Cường',
                    email: 'dtc235210009@ictu.edu.vn',
                    studentId: 'DTC235210009',
                    classId: 'K22.CNTTQT.K2.D1.01',
                    dateOfBirth: '2005-06-13'
                },
                {
                    name: 'Lưu Thế Hà',
                    email: 'dtc235210010@ictu.edu.vn',
                    studentId: 'DTC235210010',
                    classId: 'K22.CNTTQT.K2.D1.01',
                    dateOfBirth: '2005-07-10'
                }
            ]);
        }, 1500);
    });
};

export const getFileType = (file: File): 'excel' | 'csv' | 'pdf' => {
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
        return 'excel';
    }
    if (file.type === 'text/csv') {
        return 'csv';
    }
    return 'pdf';
};

export const parseFile = async (file: File): Promise<StudentData[]> => {
    const fileType = getFileType(file);

    switch (fileType) {
        case 'excel':
            return parseExcelFile(file);
        case 'csv':
            return parseCSVFile(file);
        case 'pdf':
            return parsePDFFile(file);
        default:
            throw new Error('Unsupported file type');
    }
};
