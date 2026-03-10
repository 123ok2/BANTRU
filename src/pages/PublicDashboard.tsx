import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { format, subDays } from "date-fns";
import XLSX from "xlsx-js-style";
import { Download, Search, Loader2, BarChart3, Calendar, Sun, Moon, User, Trophy, Users } from "lucide-react";
import { cn } from "../lib/utils";

interface RoomData {
  roomNumber: number;
  totalStudents: string;
  absentDetails: string;
  teacherName?: string;
}

interface StudentStat {
  name: string;
  count: number;
}

const ROOM_COUNT = 18;

const parseStudentCount = (val: string | number) => {
  const str = String(val).trim();
  if (!str) return { present: 0, total: 0 };
  
  if (str.includes('/')) {
    const [present, total] = str.split('/').map(s => Number(s.trim()));
    return { present: present || 0, total: total || 0 };
  }
  
  const num = Number(str);
  // If it's just a number, we assume it's the present count. 
  // For total, it's ambiguous, but let's assume it's also the total (full attendance) 
  // unless we have a better way to know the class size.
  return { present: num || 0, total: num || 0 }; 
};

export default function PublicDashboard() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState<"noon" | "evening">("noon");
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Statistics State
  const [statsStartDate, setStatsStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [statsEndDate, setStatsEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [topStudents, setTopStudents] = useState<StudentStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErrorMessage, setStatsErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);
    
    const q = query(
      collection(db, "attendance_records"),
      where("date", "==", date),
      where("session", "==", session)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setLoading(false);
      
      // Initialize empty structure
      const mergedRooms: RoomData[] = Array.from({ length: ROOM_COUNT }, (_, i) => ({
        roomNumber: i + 1,
        totalStudents: "",
        absentDetails: "",
      }));

      // Merge data from all teachers (if multiple)
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const docRooms = data.rooms as RoomData[];
        const teacherName = data.lastUpdatedName || data.teacherName || data.lastUpdatedEmail || data.teacherEmail; // Get teacher name
        
        docRooms.forEach((r) => {
          if (r.roomNumber >= 1 && r.roomNumber <= ROOM_COUNT) {
            // Only update if there is data
            if (r.totalStudents || r.absentDetails) {
                // Ensure we handle both string and number types from DB
                const roomData = { 
                    ...r, 
                    totalStudents: String(r.totalStudents),
                    teacherName: teacherName // Attach teacher name to room data
                };
                mergedRooms[r.roomNumber - 1] = roomData;
            }
          }
        });
      });

      setRooms(mergedRooms);
    }, (error: any) => {
      console.error("Error fetching data:", error);
      setErrorMessage(error.message || "Lỗi khi tải dữ liệu. Vui lòng kiểm tra kết nối mạng hoặc quyền truy cập.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date, session]);

  const fetchTopAbsentStudents = async () => {
    setStatsLoading(true);
    setStatsErrorMessage(null);
    try {
      const q = query(
        collection(db, "attendance_records"),
        where("date", ">=", statsStartDate),
        where("date", "<=", statsEndDate)
      );
      const querySnapshot = await getDocs(q);
      
      const studentCounts: Record<string, number> = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const docRooms = data.rooms as RoomData[];
        
        docRooms.forEach((r) => {
          if (r.absentDetails) {
            // Split by common delimiters: comma, semicolon, newline
            const parts = r.absentDetails.split(/[,;\n]/);
            parts.forEach(part => {
                // Remove content in parentheses (reason) and trim
                let name = part.replace(/\(.*\)/, "").trim();
                // Remove extra spaces
                name = name.replace(/\s+/g, ' ');
                
                if (name && name.length > 1) { // Filter out empty or single chars
                    // Normalize name for counting (optional: lowercase?) 
                    // Let's keep original case but maybe capitalize first letters for consistency?
                    // For now, just use the trimmed name.
                    studentCounts[name] = (studentCounts[name] || 0) + 1;
                }
            });
          }
        });
      });

      const sortedStudents = Object.entries(studentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopStudents(sortedStudents);
    } catch (error: any) {
      console.error("Error fetching statistics:", error);
      setStatsErrorMessage(error.message || "Lỗi khi tải dữ liệu thống kê.");
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch stats initially
  useEffect(() => {
    fetchTopAbsentStudents();
  }, []);

  const exportToExcel = () => {
    // 1. Prepare Data
    const schoolName = "TRƯỜNG PTDTBT THCS THU CÚC";
    const reportTitle = "BÁO CÁO ĐIỂM DANH BÁN TRÚ";
    const sessionText = session === "noon" ? "Buổi Trưa" : "Buổi Tối";
    // Format date to dd/MM/yyyy
    const dateObj = new Date(date);
    const dateText = `Ngày: ${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

    // Styles
    const styles = {
      title: {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "4F46E5" } }, // Indigo 600
      },
      subtitle: {
        font: { bold: true, sz: 14, color: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
      header: {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "6366F1" } }, // Indigo 500
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      },
      cell: {
        alignment: { vertical: "top", wrapText: true },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      },
      cellCenter: {
        alignment: { horizontal: "center", vertical: "top" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      },
      summary: {
        font: { bold: true },
        fill: { fgColor: { rgb: "F3F4F6" } }, // Gray 100
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      }
    };

    // Create Worksheet
    const ws = XLSX.utils.book_new().Sheets["Sheet1"] || {};

    // Build Rows with Styles
    const rows: any[][] = [];

    // Row 0: School Name
    rows.push([{ v: schoolName, s: styles.title }, null, null, null]);
    
    // Row 1: Report Title
    rows.push([{ v: reportTitle, s: styles.subtitle }, null, null, null]);
    
    // Row 2: Date & Session
    rows.push([
      { v: dateText, s: { font: { italic: true } } }, 
      null, 
      { v: sessionText, s: { font: { italic: true }, alignment: { horizontal: "right" } } }, 
      null
    ]);

    // Row 3: Spacer
    rows.push([]);

    // Row 4: Headers
    const headers = ["Phòng", "Sĩ số", "Học sinh vắng & Lý do", "Giáo viên nhập"];
    rows.push(headers.map(h => ({ v: h, s: styles.header })));

    // Data Rows
    rooms.forEach(r => {
      rows.push([
        { v: r.roomNumber, s: styles.cellCenter },
        { v: r.totalStudents || "-", s: styles.cellCenter },
        { v: r.absentDetails ? r.absentDetails.replace(/;/g, '\n') : "", s: styles.cell },
        { v: r.teacherName || "", s: styles.cell }
      ]);
    });

    // Summary Calculation
    const summary = rooms.reduce((acc, curr) => {
        const { present, total } = parseStudentCount(curr.totalStudents);
        return { present: acc.present + present, total: acc.total + total };
    }, { present: 0, total: 0 });
    const summaryText = `${summary.present}/${summary.total}`;

    // Summary Row
    rows.push([
      { v: "Tổng cộng", s: styles.summary },
      { v: summaryText, s: styles.summary },
      { v: "", s: styles.summary },
      { v: "", s: styles.summary }
    ]);

    // Create Sheet from Data
    const sheet = XLSX.utils.aoa_to_sheet(rows);

    // Apply Merges
    sheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // School Name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Report Title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Date
      { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } }  // Session
    ];

    // Set Column Widths
    sheet["!cols"] = [
      { wch: 10 }, // A: Phòng
      { wch: 15 }, // B: Sĩ số
      { wch: 60 }, // C: Vắng & Lý do
      { wch: 25 }, // D: Giáo viên
    ];

    // Create Workbook and Export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "DiemDanh");
    
    const fileName = `DiemDanh_${date}_${session === "noon" ? "Trua" : "Toi"}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Báo cáo điểm danh</h2>
            <p className="text-gray-500 text-sm mt-1">Xem và xuất dữ liệu điểm danh hàng ngày</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 pl-10 border bg-white transition-all hover:border-gray-300"
                />
            </div>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {session === 'noon' ? <Sun className="h-4 w-4 text-orange-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                </div>
                <select
                value={session}
                onChange={(e) => setSession(e.target.value as "noon" | "evening")}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 pl-10 border bg-white transition-all hover:border-gray-300"
                >
                <option value="noon">Buổi Trưa</option>
                <option value="evening">Buổi Tối</option>
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Đã xảy ra lỗi</h3>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-3">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-800 text-lg">
                      Danh sách phòng
                  </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
                  {date}
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
                  {session === "noon" ? "Trưa" : "Tối"}
                </span>
                {(() => {
                    const uniqueTeachers = Array.from(new Set(rooms.map(r => r.teacherName).filter(Boolean)));
                    if (uniqueTeachers.length > 0) {
                        return (
                            <span className="flex items-center gap-1 text-indigo-600 ml-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs font-medium">
                                <User className="h-3 w-3" />
                                {uniqueTeachers.join(", ")}
                            </span>
                        );
                    }
                    return null;
                })()}
              </div>
            </div>
            <button
                onClick={exportToExcel}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:border-gray-300"
            >
                <Download className="h-4 w-4 mr-2 text-green-600" />
                Xuất Excel
            </button>
        </div>

        {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
                <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                <tr>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-16 border-r border-gray-100">
                    Phòng
                    </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24 border-r border-gray-100">
                    Sĩ số
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Học sinh vắng & Lý do
                    </th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                {rooms.map((room, index) => (
                    <tr key={room.roomNumber} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-center bg-gray-50/30 group-hover:bg-transparent transition-colors align-top border-r border-gray-100">
                        <div className="mt-1">{room.roomNumber}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center align-top border-r border-gray-100">
                        <div className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-md font-bold text-sm mt-1",
                          room.totalStudents ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "text-gray-400"
                        )}>
                          {room.totalStudents || "-"}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 align-top">
                        {room.absentDetails ? (
                          <div className="flex flex-wrap gap-1.5">
                            {room.absentDetails.split(';').map((detail, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 text-xs font-medium leading-tight">
                                {detail.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 italic text-xs mt-1.5 block">Không có ghi chú</span>
                        )}
                    </td>
                    </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-100">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center uppercase tracking-wider border-r border-gray-200">
                        Tổng
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center border-r border-gray-200">
                        {(() => {
                            const summary = rooms.reduce((acc, curr) => {
                                const { present, total } = parseStudentCount(curr.totalStudents);
                                return { present: acc.present + present, total: acc.total + total };
                            }, { present: 0, total: 0 });
                            return (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-gray-900 text-white shadow-sm text-xs">
                                {summary.present}/{summary.total}
                              </span>
                            );
                        })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500"></td>
                </tr>
                </tbody>
            </table>
            </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <div className="bg-yellow-100 p-1.5 rounded-lg mr-3">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </div>
                    Top 10 Học sinh nghỉ học nhiều nhất
                </h2>
                <p className="text-gray-500 text-sm mt-1 ml-11">Thống kê theo khoảng thời gian</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                <div className="relative group">
                    <span className="text-[10px] uppercase font-bold text-gray-400 absolute -top-2 left-2 bg-white px-1">Từ ngày</span>
                    <input
                        type="date"
                        value={statsStartDate}
                        onChange={(e) => setStatsStartDate(e.target.value)}
                        className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border bg-white"
                    />
                </div>
                <div className="relative group">
                    <span className="text-[10px] uppercase font-bold text-gray-400 absolute -top-2 left-2 bg-white px-1">Đến ngày</span>
                    <input
                        type="date"
                        value={statsEndDate}
                        onChange={(e) => setStatsEndDate(e.target.value)}
                        className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border bg-white"
                    />
                </div>
                <button
                    onClick={fetchTopAbsentStudents}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all hover:shadow-indigo-500/30"
                >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Thống kê
                </button>
            </div>
        </div>

        {statsLoading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topStudents.length > 0 ? (
                    topStudents.map((student, index) => (
                        <div key={index} className="flex items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-indigo-100 group relative overflow-hidden">
                            <div className={cn(
                              "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm mr-4 z-10",
                              index === 0 ? "bg-yellow-100 text-yellow-700" :
                              index === 1 ? "bg-gray-100 text-gray-700" :
                              index === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-indigo-50 text-indigo-600"
                            )}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0 z-10">
                              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                {student.name}
                              </p>
                              <div className="flex items-center mt-1">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full" 
                                    style={{ width: `${Math.min((student.count / topStudents[0].count) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 flex-shrink-0 z-10">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {student.count} nghỉ
                              </span>
                            </div>
                            
                            {/* Decorative background for top 3 */}
                            {index < 3 && (
                              <div className={cn(
                                "absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10 blur-xl",
                                index === 0 ? "bg-yellow-400" :
                                index === 1 ? "bg-gray-400" :
                                "bg-orange-400"
                              )}></div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <User className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 italic">Không có dữ liệu trong khoảng thời gian này</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
