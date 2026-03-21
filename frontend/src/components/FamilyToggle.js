import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, ChevronDown, User, Check, Home } from "lucide-react";
import { useFamilyContext } from "@/context/FamilyContext";

const FamilyToggle = () => {
  const { family, activeViewId, activeViewLabel, isPersonalView, isFamilyView, switchToPersonal, switchToMember, switchToFamily } = useFamilyContext();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClick = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Calculate position when opening
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open]);

  if (!family || !family.members || family.members.length < 1) return null;

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-52 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        zIndex: 999999,
        boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
      }}
      data-testid="family-toggle-dropdown"
    >
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Viewing as</p>
      </div>
      <div className="py-1">
        {/* Personal */}
        <button
          onClick={() => { switchToPersonal(); setOpen(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          data-testid="toggle-personal"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#DBEAFE", color: "#2563EB" }}>
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm text-gray-700 flex-1 text-left">Personal</span>
          {isPersonalView && <Check className="h-4 w-4 text-green-500" />}
        </button>
        {/* Family members */}
        {family.members.filter(m => m.role !== "owner").map((member) => (
          <button
            key={member.id}
            onClick={() => { switchToMember(member.id); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors"
            data-testid={`toggle-member-${member.id}`}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#F3E8FF", color: "#7C3AED" }}>
              {(member.name || member.relationship || "?").charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-700 block">{member.name || member.relationship || "Member"}</span>
              {member.name && member.relationship && <span className="text-[10px] text-gray-400">{member.relationship}</span>}
            </div>
            {activeViewId === member.id && <Check className="h-4 w-4 text-green-500" />}
          </button>
        ))}
        {/* Combined Family View */}
        <div className="border-t border-gray-100 mt-1 pt-1">
          <button
            onClick={() => { switchToFamily(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition-colors"
            data-testid="toggle-family"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#DBEAFE", color: "#2563EB" }}>
              <Home className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm text-gray-700 block">{family.familyName || "Family"}</span>
              <span className="text-[10px] text-gray-400">Combined Net Worth</span>
            </div>
            {isFamilyView && <Check className="h-4 w-4 text-green-500" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="relative" data-testid="family-toggle">
        <button
          ref={btnRef}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
          style={{
            backgroundColor: isPersonalView ? "rgba(255,255,255,0.15)" : isFamilyView ? "rgba(59,130,246,0.85)" : "rgba(124,58,237,0.85)",
            color: "white",
            backdropFilter: "blur(8px)"
          }}
          data-testid="family-toggle-btn"
        >
          {isPersonalView ? <User className="h-3.5 w-3.5" /> : isFamilyView ? <Home className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
          <span className="max-w-[80px] truncate">{activeViewLabel}</span>
          <ChevronDown className="h-3 w-3" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }} />
        </button>
      </div>
      {dropdown}
    </>
  );
};

export default FamilyToggle;
