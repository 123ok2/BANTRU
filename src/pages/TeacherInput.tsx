import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc } from "firebase/firestore";
import { format } from "date-fns";
import { Loader2, Save, CheckCircle, Plus, X, Edit2, Calendar, Sun, Moon, User } from "lucide-react";
import { cn } from "../lib/utils";

interface RoomData {
  roomNumber: number;
  totalStudents: string;
  absentDetails: string;
}

interface AbsentStudent {
  name: string;
  reason: string;
}

const ROOM_COUNT = 18;

export default function TeacherInput() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState<"noon" | "evening">("noon");
  const [rooms, setRooms] = useState<RoomData[]>(
    Array.from({ length: ROOM_COUNT }, (_, i) => ({
      roomNumber: i + 1,
      totalStudents: "",
      absentDetails: "",
    }))
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState<number | null>(null);
  const [tempAbsentList, setTempAbsentList] = useState<AbsentStudent[]>([]);
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("");

  // Load existing data if any
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "attendance_records"),
          where("date", "==", date),
          where("session", "==", session),
          where("teacherId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          // Merge loaded data with default structure to ensure all 18 rooms exist
          const loadedRooms = data.rooms || [];
          const mergedRooms = Array.from({ length: ROOM_COUNT }, (_, i) => {
            const existing = loadedRooms.find((r: any) => r.roomNumber === i + 1);
            return existing || { roomNumber: i + 1, totalStudents: "", absentDetails: "" };
          });
          setRooms(mergedRooms);
        } else {
          // Reset if no data found
           setRooms(Array.from({ length: ROOM_COUNT }, (_, i) => ({
            roomNumber: i + 1,
            totalStudents: "",
            absentDetails: "",
          })));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [date, session, user]);

  const handleRoomChange = (index: number, field: keyof RoomData, value: any) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRooms(newRooms);
  };

  // Modal Handlers
  const openAbsentModal = (index: number) => {
    setCurrentRoomIndex(index);
    const details = rooms[index].absentDetails;
    const parsedList: AbsentStudent[] = [];
    
    if (details) {
      // Parse existing string: "Name (Reason); Name (Reason)"
      const parts = details.split(';');
      parts.forEach(part => {
        const match = part.trim().match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          parsedList.push({ name: match[1].trim(), reason: match[2].trim() });
        } else if (part.trim()) {
          // Fallback for simple strings or other formats
          parsedList.push({ name: part.trim(), reason: "" });
        }
      });
    }
    
    setTempAbsentList(parsedList);
    setNewName("");
    setNewReason("");
    setIsModalOpen(true);
  };

  const addStudentToTempList = () => {
    if (!newName.trim()) return;
    setTempAbsentList([...tempAbsentList, { name: newName.trim(), reason: newReason.trim() }]);
    setNewName("");
    setNewReason("");
  };

  const removeStudentFromTempList = (idx: number) => {
    const newList = [...tempAbsentList];
    newList.splice(idx, 1);
    setTempAbsentList(newList);
  };

  const saveModalData = () => {
    if (currentRoomIndex !== null) {
      // Serialize back to string: "Name (Reason); Name (Reason)"
      const detailsString = tempAbsentList
        .map(s => s.reason ? `${s.name} (${s.reason})` : s.name)
        .join('; ');
      
      handleRoomChange(currentRoomIndex, "absentDetails", detailsString);
    }
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccess(false);

    try {
      // Check if record exists to update or create new
      const q = query(
        collection(db, "attendance_records"),
        where("date", "==", date),
        where("session", "==", session),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);

      const recordData = {
        date,
        session,
        teacherId: user.uid,
        teacherEmail: user.email,
        teacherName: user.displayName || user.email, // Save teacher name
        rooms: rooms,
        updatedAt: Timestamp.now(),
      };

      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await setDoc(doc(db, "attendance_records", docId), recordData, { merge: true });
      } else {
        await addDoc(collection(db, "attendance_records"), recordData);
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 relative max-w-5xl mx-auto">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Nhập liệu điểm danh</h2>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                  <User className="h-4 w-4 mr-1.5 text-indigo-500" />
                  <span>Giáo viên: <span className="font-semibold text-gray-900">{user?.displayName || user?.email}</span></span>
              </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              Ngày điểm danh
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-xl border-gray-200 bg-gray-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 transition-all hover:bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              {session === 'noon' ? <Sun className="h-4 w-4 text-orange-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              Buổi
            </label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSession("noon")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
                  session === "noon" 
                    ? "bg-white text-orange-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Sun className="h-4 w-4" />
                Buổi Trưa
              </button>
              <button
                type="button"
                onClick={() => setSession("evening")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
                  session === "evening" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Moon className="h-4 w-4" />
                Buổi Tối
              </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20 text-center">
                  Phòng
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48 text-center">
                  Sĩ số (Hiện diện/Tổng)
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Học sinh vắng & Lý do
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rooms.map((room, index) => (
                <tr key={room.roomNumber} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-center bg-gray-50/30 group-hover:bg-transparent transition-colors">
                    {room.roomNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={room.totalStudents}
                      onChange={(e) => handleRoomChange(index, "totalStudents", e.target.value)}
                      className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg font-semibold p-2.5 border text-center transition-all hover:border-gray-300 bg-white"
                      placeholder="VD: 8/10"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div 
                        className={cn(
                          "relative flex items-center w-full rounded-xl border shadow-sm bg-white p-2.5 min-h-[46px] cursor-pointer transition-all duration-200 group-hover:border-indigo-200",
                          room.absentDetails ? "border-indigo-100 bg-indigo-50/30" : "border-gray-200 hover:bg-gray-50"
                        )}
                        onClick={() => openAbsentModal(index)}
                    >
                        <span className={cn("text-sm flex-1 truncate", !room.absentDetails && "text-gray-400 italic")}>
                            {room.absentDetails || "Chạm để nhập danh sách vắng..."}
                        </span>
                        <div className="bg-gray-100 p-1.5 rounded-lg group-hover:bg-indigo-100 transition-colors">
                          <Edit2 className="h-3.5 w-3.5 text-gray-500 group-hover:text-indigo-600" />
                        </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-4 bg-white/80 backdrop-blur-md border-t border-gray-200 fixed bottom-16 left-0 right-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:absolute md:bottom-0 md:shadow-none md:border-t-0 md:bg-gray-50">
          <div className="max-w-7xl mx-auto flex justify-end px-4 sm:px-6 lg:px-8 md:px-0">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-lg text-sm font-bold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto transition-all duration-200 transform active:scale-95",
                success 
                  ? "bg-green-600 hover:bg-green-700 shadow-green-500/30" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 hover:-translate-y-0.5"
              )}
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : success ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Đã lưu thành công!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Lưu dữ liệu
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Modal for Absent Students */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Phòng {currentRoomIndex !== null ? rooms[currentRoomIndex].roomNumber : ""}
                        </h3>
                        <p className="text-xs text-gray-500">Danh sách học sinh vắng</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(false)} 
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    {/* List of added students */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[120px] max-h-[200px] overflow-y-auto custom-scrollbar">
                        {tempAbsentList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-4">
                              <User className="h-8 w-8 opacity-20" />
                              <p className="text-sm italic">Chưa có học sinh nào được thêm</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                              {tempAbsentList.map((student, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm group hover:border-indigo-200 transition-colors">
                                      <div>
                                          <span className="font-semibold text-gray-800 block">{student.name}</span>
                                          {student.reason && (
                                              <span className="text-gray-500 text-xs flex items-center mt-0.5">
                                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-1.5"></span>
                                                {student.reason}
                                              </span>
                                          )}
                                      </div>
                                      <button 
                                          onClick={() => removeStudentFromTempList(idx)}
                                          className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                      >
                                          <X className="h-4 w-4" />
                                      </button>
                                  </div>
                              ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 block">Thêm học sinh mới</label>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Nhập tên học sinh..."
                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border bg-gray-50 focus:bg-white transition-colors"
                            />
                            <div className="flex gap-2">
                              <input
                                  type="text"
                                  value={newReason}
                                  onChange={(e) => setNewReason(e.target.value)}
                                  placeholder="Lý do (VD: Ốm...)"
                                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border bg-gray-50 focus:bg-white transition-colors"
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addStudentToTempList();
                                      }
                                  }}
                              />
                              <button
                                  type="button"
                                  onClick={addStudentToTempList}
                                  disabled={!newName.trim()}
                                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:shadow-md active:scale-95 whitespace-nowrap"
                              >
                                  <Plus className="h-5 w-5" />
                              </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={saveModalData}
                        className="px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:shadow-indigo-500/30 hover:-translate-y-0.5"
                    >
                        Xác nhận xong
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
