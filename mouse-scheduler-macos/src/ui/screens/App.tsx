import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardScreen } from "./DashboardScreen";
import { MacrosScreen } from "./MacrosScreen";
import { MacroEditorScreen } from "./MacroEditorScreen";
import { SchedulerScreen } from "./SchedulerScreen";
import { PermissionsScreen } from "./PermissionsScreen";

export function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Mouse Scheduler</div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/macros">Macros</NavLink>
          <NavLink to="/scheduler">Scheduler</NavLink>
          <NavLink to="/permissions">Permissions</NavLink>
        </nav>
        <div style={{ marginTop: 16 }}>
          <small>
            Global hook/automation kütüphaneleri opsiyoneldir. Yüklü değilse kayıt/oynatma
            “adapter missing” hatası verir.
          </small>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/macros" element={<MacrosScreen />} />
          <Route path="/macros/:macroId" element={<MacroEditorScreen />} />
          <Route path="/scheduler" element={<SchedulerScreen />} />
          <Route path="/permissions" element={<PermissionsScreen />} />
        </Routes>
      </main>
    </div>
  );
}

