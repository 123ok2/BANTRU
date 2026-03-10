import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
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
  className: string;
  reason: string;
}

const ROOM_COUNT = 18;

export default function TeacherInput() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [session, setSession] = useState<"noon" | "evening" | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>(
    Array.from({ length: ROOM_COUNT }, (_, i) => ({
      roomNumber: i + 1,
      totalStudents: "",
      absentDetails: "",
    }))
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dirtyRooms, setDirtyRooms] = useState<Set<number>>(new Set());
  const dirtyRoomsRef = useRef<Set<number>>(new Set());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState<number | null>(null);
  const [tempAbsentList, setTempAbsentList] = useState<AbsentStudent[]>([]);
  const [newName, setNewName] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newReason, setNewReason] = useState("");

  // Name prompt state
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [promptGender, setPromptGender] = useState<"male" | "female" | "">("");
  const [updatingName, setUpdatingName] = useState(false);

  // Greeting modal state
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState("");

  useEffect(() => {
    if (user) {
      // Check if user has displayName and photoURL (used for gender)
      if (!user.displayName || !user.photoURL) {
        setShowNamePrompt(true);
      } else {
        // If they have info, show greeting every time they open the app
        const title = user.photoURL === "female" ? "Cô" : "Thầy";
        const name = user.displayName;
        const hour = new Date().getHours();
        let timeGreeting = "Chào buổi tối";
        if (hour < 12) timeGreeting = "Chào buổi sáng";
        else if (hour < 18) timeGreeting = "Chào buổi chiều";
        
        setGreetingMessage(`${timeGreeting}, ${title} ${name}! Chúc ${title} một ngày làm việc hiệu quả.`);
        setShowGreeting(true);
      }
    }
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptName.trim() || !promptGender || !user) return;
    
    setUpdatingName(true);
    try {
      // We use photoURL to store gender since Firebase Auth doesn't have a dedicated gender field
      await updateProfile(user, { 
        displayName: promptName.trim(),
        photoURL: promptGender 
      });
      setShowNamePrompt(false);
      
      // Show greeting after updating
      const title = promptGender === "female" ? "Cô" : "Thầy";
      const name = promptName.trim();
      const hour = new Date().getHours();
      let timeGreeting = "Chào buổi tối";
      if (hour < 12) timeGreeting = "Chào buổi sáng";
      else if (hour < 18) timeGreeting = "Chào buổi chiều";
      
      setGreetingMessage(`${timeGreeting}, ${title} ${name}! Chúc ${title} một ngày làm việc hiệu quả.`);
      setShowGreeting(true);
      
      // Don't reload, just let React update the UI
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.");
    } finally {
      setUpdatingName(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  // Load existing data if any
  useEffect(() => {
    if (!user || !session) return;
    
    setLoading(true);
    setErrorMessage(null);
    
    const q = query(
      collection(db, "attendance_records"),
      where("date", "==", date),
      where("session", "==", session)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setLoading(false);
      
      if (!querySnapshot.empty) {
        // Initialize empty structure
        const mergedRooms: RoomData[] = Array.from({ length: ROOM_COUNT }, (_, i) => ({
          roomNumber: i + 1,
          totalStudents: "",
          absentDetails: "",
        }));

        // Merge data from all documents
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (!data || !Array.isArray(data.rooms)) return;
          
          const docRooms = data.rooms as RoomData[];
          
          docRooms.forEach((r) => {
            if (r && typeof r === 'object' && r.roomNumber >= 1 && r.roomNumber <= ROOM_COUNT) {
              if (r.totalStudents || r.absentDetails) {
                  mergedRooms[r.roomNumber - 1] = {
                    ...r,
                    totalStudents: String(r.totalStudents || "")
                  };
              }
            }
          });
        });
        
        // Only update local state for rooms that haven't been edited locally
        setRooms(prevRooms => {
          const newRooms = [...prevRooms];
          const currentDirty = dirtyRoomsRef.current;
          mergedRooms.forEach((room, index) => {
            if (!currentDirty.has(index)) {
              newRooms[index] = room;
            }
          });
          return newRooms;
        });
      } else {
        // Reset if no data found, but keep dirty rooms
        setRooms(prevRooms => {
          const newRooms = Array.from({ length: ROOM_COUNT }, (_, i) => ({
            roomNumber: i + 1,
            totalStudents: "",
            absentDetails: "",
          }));
          const currentDirty = dirtyRoomsRef.current;
          currentDirty.forEach(index => {
            if (prevRooms[index]) {
              newRooms[index] = prevRooms[index];
            }
          });
          return newRooms;
        });
      }
    }, (error: any) => {
      console.error("Error loading data:", error);
      setErrorMessage(error.message || "Lỗi khi tải dữ liệu. Vui lòng kiểm tra kết nối mạng hoặc quyền truy cập.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date, session, user]);

  const handleRoomChange = (index: number, field: keyof RoomData, value: any) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRooms(newRooms);
    
    // Mark this room as dirty (edited locally)
    setDirtyRooms(prev => {
      const next = new Set(prev);
      next.add(index);
      dirtyRoomsRef.current = next;
      return next;
    });
  };

  // Modal Handlers
  const openAbsentModal = (index: number) => {
    setCurrentRoomIndex(index);
    const details = rooms[index].absentDetails;
    const parsedList: AbsentStudent[] = [];
    
    if (details) {
      // Parse existing string: "Name - Class (Reason); Name (Reason)"
      const parts = details.split(';');
      parts.forEach(part => {
        let name = part.trim();
        let className = "";
        let reason = "";

        // Extract reason first (content in parens at the end)
        const reasonMatch = name.match(/^(.*)\s*\((.*)\)$/);
        if (reasonMatch) {
            name = reasonMatch[1].trim();
            reason = reasonMatch[2].trim();
        }

        // Extract class from name (Name - Class)
        const classMatch = name.match(/^(.*)\s*-\s*(.*)$/);
        if (classMatch) {
            name = classMatch[1].trim();
            className = classMatch[2].trim();
        }

        if (name) {
            parsedList.push({ name, className, reason });
        }
      });
    }
    
    setTempAbsentList(parsedList);
    setNewName("");
    setNewClassName("");
    setNewReason("");
    setIsModalOpen(true);
  };

  const addStudentToTempList = () => {
    if (!newName.trim()) return;
    setTempAbsentList([...tempAbsentList, { 
        name: newName.trim(), 
        className: newClassName.trim(),
        reason: newReason.trim() 
    }]);
    setNewName("");
    setNewClassName("");
    setNewReason("");
  };

  const removeStudentFromTempList = (idx: number) => {
    const newList = [...tempAbsentList];
    newList.splice(idx, 1);
    setTempAbsentList(newList);
  };

  const saveModalData = () => {
    if (currentRoomIndex !== null) {
      let finalAbsentList = [...tempAbsentList];
      
      // Automatically add pending input if user forgot to click "Thêm"
      if (newName.trim()) {
          finalAbsentList.push({
              name: newName.trim(),
              className: newClassName.trim(),
              reason: newReason.trim()
          });
      }

      // Serialize back to string: "Name - Class (Reason); Name (Reason)"
      const detailsString = finalAbsentList
        .map(s => {
            let str = s.name;
            if (s.className) str += ` - ${s.className}`;
            if (s.reason) str += ` (${s.reason})`;
            return str;
        })
        .join('; ');
      
      handleRoomChange(currentRoomIndex, "absentDetails", detailsString);
    }
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      setErrorMessage("Vui lòng chọn buổi điểm danh (Trưa/Tối) trước khi lưu.");
      return;
    }
    setLoading(true);
    setSuccess(false);
    setErrorMessage(null);

    try {
      // Check if record exists to update or create new
      const q = query(
        collection(db, "attendance_records"),
        where("date", "==", date),
        where("session", "==", session)
      );
      const querySnapshot = await getDocs(q);

      let finalRoomsToSave = [...rooms];

      if (!querySnapshot.empty) {
        // Merge with existing data from DB to prevent overwriting other teachers' changes
        const mergedRooms: RoomData[] = Array.from({ length: ROOM_COUNT }, (_, i) => ({
          roomNumber: i + 1,
          totalStudents: "",
          absentDetails: "",
        }));

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const docRooms = data.rooms as RoomData[] || [];
          docRooms.forEach((r) => {
            if (r.roomNumber >= 1 && r.roomNumber <= ROOM_COUNT) {
              if (r.totalStudents || r.absentDetails) {
                  mergedRooms[r.roomNumber - 1] = {
                    ...r,
                    totalStudents: String(r.totalStudents)
                  };
              }
            }
          });
        });

        // Apply our dirty changes on top of the merged DB data
        dirtyRooms.forEach(index => {
          mergedRooms[index] = rooms[index];
        });
        
        finalRoomsToSave = mergedRooms;
      }

      const recordData = {
        date,
        session,
        lastUpdatedBy: user.uid,
        lastUpdatedEmail: user.email,
        lastUpdatedName: user.displayName || user.email, // Save teacher name
        rooms: finalRoomsToSave,
        updatedAt: Timestamp.now(),
      };

      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await setDoc(doc(db, "attendance_records", docId), recordData, { merge: true });
      } else {
        await addDoc(collection(db, "attendance_records"), recordData);
      }
      
      setRooms(finalRoomsToSave);
      setDirtyRooms(new Set()); // Clear dirty state after successful save
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving document: ", error);
      setErrorMessage(error.message || "Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 relative max-w-5xl mx-auto">
      {/* Name and Gender Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 bg-indigo-50/50">
              <h3 className="text-lg font-bold text-indigo-900">Chào mừng bạn đến với hệ thống!</h3>
              <p className="text-sm text-indigo-700 mt-1">Vui lòng cập nhật thông tin để tiếp tục.</p>
            </div>
            <form onSubmit={handleUpdateName} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên giáo viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giới tính <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPromptGender("male")}
                    className={cn(
                      "py-2 px-4 rounded-xl border text-sm font-medium transition-all",
                      promptGender === "male"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    Nam (Thầy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptGender("female")}
                    className={cn(
                      "py-2 px-4 rounded-xl border text-sm font-medium transition-all",
                      promptGender === "female"
                        ? "border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    Nữ (Cô)
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={updatingName || !promptName.trim() || !promptGender}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all mt-6"
              >
                {updatingName ? (
                  <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Đang cập nhật...</>
                ) : (
                  "Cập nhật thông tin"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Greeting Modal */}
      {showGreeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 transform transition-all">
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
                <Sun className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Chào mừng!</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                {greetingMessage}
              </p>
              <button
                onClick={() => setShowGreeting(false)}
                className="mt-8 w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-3 bg-indigo-600 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm transition-colors"
              >
                Bắt đầu làm việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 tracking-tight">
                {getGreeting()}, <span className="text-indigo-600">{user?.photoURL === "female" ? "Cô" : user?.photoURL === "male" ? "Thầy" : "Thầy/Cô"} {user?.displayName || ""}</span>!
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1 mb-2 sm:mb-3">Chúc {user?.photoURL === "female" ? "Cô" : user?.photoURL === "male" ? "Thầy" : "Thầy/Cô"} một ngày làm việc hiệu quả.</p>
              <div className="flex items-center text-[11px] sm:text-sm text-gray-500 bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg inline-flex border border-gray-100">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-indigo-500" />
                  <span className="truncate max-w-[200px] sm:max-w-none">Tài khoản: <span className="font-semibold text-gray-900">{user?.email}</span></span>
              </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5 sm:gap-2">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
              Ngày điểm danh
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-xl border-gray-200 bg-gray-50/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 sm:p-3 transition-all hover:bg-white"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5 sm:gap-2">
              {session === 'noon' ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />}
              Buổi
            </label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSession("noon")}
                className={cn(
                  "flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2",
                  session === "noon" 
                    ? "bg-white text-orange-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Buổi Trưa
              </button>
              <button
                type="button"
                onClick={() => setSession("evening")}
                className={cn(
                  "flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2",
                  session === "evening" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Buổi Tối
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
          <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Đã xảy ra lỗi</h3>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {!session ? (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-50 mb-4">
            <Calendar className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa chọn buổi điểm danh</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Vui lòng chọn <span className="font-semibold text-orange-600">Buổi Trưa</span> hoặc <span className="font-semibold text-indigo-600">Buổi Tối</span> ở bảng điều khiển phía trên để bắt đầu nhập dữ liệu điểm danh.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setSession("noon")}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-medium hover:bg-orange-100 transition-colors border border-orange-200"
            >
              <Sun className="h-4 w-4" />
              Chọn Buổi Trưa
            </button>
            <button
              onClick={() => setSession("evening")}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              <Moon className="h-4 w-4" />
              Chọn Buổi Tối
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 relative">
          <div className="overflow-x-auto rounded-t-2xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className="px-2 sm:px-4 py-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider w-12 sm:w-20">
                  Phòng
                </th>
                <th scope="col" className="px-2 sm:px-4 py-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider w-24 sm:w-48">
                  Sĩ số (Hiện diện/Tổng)
                </th>
                <th scope="col" className="px-2 sm:px-4 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Học sinh vắng & Lý do
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rooms.map((room, index) => (
                <tr key={room.roomNumber} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900 text-center bg-gray-50/30 group-hover:bg-transparent transition-colors">
                    {room.roomNumber}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={room.totalStudents}
                      onChange={(e) => handleRoomChange(index, "totalStudents", e.target.value)}
                      className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm sm:text-lg font-semibold p-2 sm:p-2.5 border text-center transition-all hover:border-gray-300 bg-white"
                      placeholder="VD: 8/10"
                    />
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div 
                        className={cn(
                          "relative flex items-center w-full rounded-xl border shadow-sm bg-white p-2 sm:p-2.5 min-h-[40px] sm:min-h-[46px] cursor-pointer transition-all duration-200 group-hover:border-indigo-200",
                          room.absentDetails ? "border-indigo-100 bg-indigo-50/30" : "border-gray-200 hover:bg-gray-50"
                        )}
                        onClick={() => openAbsentModal(index)}
                    >
                        <span className={cn("text-xs sm:text-sm flex-1 truncate", !room.absentDetails && "text-gray-400 italic")}>
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
        
        <div className="sticky bottom-16 md:bottom-0 px-4 py-4 bg-white/90 backdrop-blur-md border-t border-gray-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-2xl">
          <div className="max-w-7xl mx-auto flex justify-end">
            <button
              type="submit"
              disabled={loading || !session}
              className={cn(
                "inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-lg text-sm font-bold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto transition-all duration-200 transform active:scale-95",
                success 
                  ? "bg-green-600 hover:bg-green-700 shadow-green-500/30" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
      )}

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
                
                <div className="p-6 space-y-6">
                    {/* List of added students */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[120px] max-h-[240px] overflow-y-auto custom-scrollbar">
                        {tempAbsentList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-8">
                              <User className="h-10 w-10 opacity-20" />
                              <p className="text-sm italic">Chưa có học sinh nào được thêm</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                              {tempAbsentList.map((student, idx) => (
                                  <div key={idx} className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-gray-900 truncate">{student.name}</span>
                                              {student.className && (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                      {student.className}
                                                  </span>
                                              )}
                                          </div>
                                          {student.reason && (
                                              <div className="text-gray-500 text-xs flex items-center">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                                                <span className="truncate">{student.reason}</span>
                                              </div>
                                          )}
                                      </div>
                                      <button 
                                          onClick={() => removeStudentFromTempList(idx)}
                                          className="ml-2 text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                          title="Xóa"
                                      >
                                          <X className="h-4 w-4" />
                                      </button>
                                  </div>
                              ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-900">Thêm học sinh mới</label>
                            <span className="text-xs text-gray-500 font-normal">Nhập thông tin bên dưới</span>
                        </div>
                        
                        <div className="space-y-3 bg-white p-1 rounded-xl">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Nhập tên học sinh..."
                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border bg-gray-50 focus:bg-white transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        // Focus next input or add if valid
                                    }
                                }}
                            />
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <input
                                        type="text"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        placeholder="Lớp (VD: 9A)"
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 border bg-gray-50 focus:bg-white transition-colors"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addStudentToTempList();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="col-span-2">
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
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addStudentToTempList}
                                disabled={!newName.trim()}
                                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all active:scale-95 mt-2"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Thêm vào danh sách
                            </button>
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
