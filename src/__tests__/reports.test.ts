import { exportReportsToExcel } from '../controllers/reports.controller';
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';

// Mocking Firebase service
jest.mock('../../services/firebase.service', () => ({
  isFirebaseConnected: jest.fn(() => false),
  firestore: null,
}));

// Mocking Postgres service
jest.mock('../../services/postgres.service', () => ({
  isPostgresConnected: jest.fn(() => false),
}));

describe('Reports & Export Security Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let endMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();
    endMock = jest.fn();

    req = {
      query: {},
    };
    res = {
      json: jsonMock,
      status: statusMock,
      setHeader: setHeaderMock,
      end: endMock,
    } as any;
    jest.clearAllMocks();
  });

  it('should return 400 Bad Request for unsupported report type', async () => {
    req.query = { type: 'invalid-type' };

    await exportReportsToExcel(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Unsupported report export type' });
  });

  it('should successfully build activities-23 standard Excel with correct headers', async () => {
    req.query = { type: 'activities-23' };

    // Mock ExcelJS workbook write
    const writeSpy = jest.spyOn(ExcelJS.Workbook.prototype.xlsx, 'write').mockImplementation(async (stream: any) => {
      // Simulate successful Excel generation and stream writing
      return;
    });

    await exportReportsToExcel(req as Request, res as Response);

    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=Standard_23_Economic_Activities.xlsx');
    expect(writeSpy).toHaveBeenCalled();
    expect(endMock).toHaveBeenCalled();

    writeSpy.mockRestore();
  });
});
