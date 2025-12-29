import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { AnalyticsView } from './components/AnalyticsView';
import { ExpensesView } from './components/ExpensesView';
import { MileageView } from './components/MileageView';
import { InvoiceView } from './components/InvoiceView';
import { ProfileView } from './components/ProfileView';

// Global Modals
import { QuickCaptureDrawer } from './components/QuickCaptureDrawer';
import { NotificationModal } from './components/NotificationModal';
import { BankStatementUpload } from './components/BankStatementUpload';
import { TransactionEditor } from './components/TransactionEditor';
import { InvoiceEditor } from './components/InvoiceEditor';
import { MileageEditor } from './components/MileageEditor';
import { Invoice } from './types';

const AppContent: React.FC = () => {
  const { 
    session, ledgerMode, transactions, properties, budgetSettings, mileageLogs, invoices, userProfile, notifications,
    isDrawerOpen, setIsDrawerOpen,
    isStatementModalOpen, setIsStatementModalOpen,
    isNotificationModalOpen, setIsNotificationModalOpen,
    editingTransaction, setEditingTransaction,
    addTransaction, updateTransaction, deleteTransaction, saveMileage, saveInvoice, deleteInvoice, updateProfile, uploadAvatar, logout,
    theme, toggleTheme
  } = useData();

  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | 'new' | null>(null);

  if (!session) return <AuthScreen />;

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsView mode={ledgerMode} transactions={transactions} />} />
          <Route path="/expenses" element={<ExpensesView transactions={transactions} properties={properties} onEditTransaction={setEditingTransaction} />} />
          <Route path="/mileage" element={<MileageView logs={mileageLogs} onAddTrip={() => setIsMileageModalOpen(true)} />} />
          <Route path="/invoices" element={<InvoiceView invoices={invoices} onNewInvoice={() => setEditingInvoice('new')} onEditInvoice={setEditingInvoice} />} />
          <Route path="/profile" element={
            <ProfileView 
              profile={userProfile} 
              onLogout={logout} 
              onUpdateProfile={updateProfile} 
              onUploadAvatar={uploadAvatar} 
              theme={theme}
              onToggleTheme={toggleTheme}
              transactions={transactions} 
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>

      {/* Global Drawers & Modals */}
      {isDrawerOpen && (
          <QuickCaptureDrawer 
            isOpen={true} 
            onClose={() => setIsDrawerOpen(false)} 
            onAddTransaction={addTransaction} 
            properties={properties} 
            budgets={budgetSettings} 
          />
      )}
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
      <BankStatementUpload isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)} onImport={addTransaction} properties={properties} currentMode={ledgerMode} />
      {editingTransaction && (
          <TransactionEditor 
            isOpen={true} 
            onClose={() => setEditingTransaction(null)} 
            transaction={editingTransaction} 
            onSave={updateTransaction} 
            onDelete={deleteTransaction} 
            properties={properties} 
          />
      )}
      {editingInvoice && (
          <InvoiceEditor 
              isOpen={true} 
              onClose={() => setEditingInvoice(null)} 
              invoice={typeof editingInvoice === 'object' ? editingInvoice : null} 
              onSave={saveInvoice}
              onDelete={deleteInvoice}
              profile={userProfile}
          />
      )}
      {isMileageModalOpen && (
          <MileageEditor 
            isOpen={true} 
            onClose={() => setIsMileageModalOpen(false)} 
            onSave={saveMileage} 
          />
      )}
    </HashRouter>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}