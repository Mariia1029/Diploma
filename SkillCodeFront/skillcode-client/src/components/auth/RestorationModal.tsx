import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restoreAccount } from '../../api/usersApi';
import '../../styles/restoration.css';

export default function RestorationModal() {
  const { accessToken, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    setLoading(true);
    try {
      await restoreAccount(accessToken ?? '');
      updateUser({ isDeleted: false });
    } catch {
      // ignore — modal stays open
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rm-overlay">
      <div className="rm-card">
        <div className="rm-icon">⚠</div>
        <div className="rm-title">// акаунт деактивовано</div>
        <div className="rm-body">
          Ваш акаунт було деактивовано. Ви можете відновити його — всі ваші дані збережено.
          Або закрити сесію і вийти.
        </div>
        <div className="rm-actions">
          <button className="rm-btn-primary" onClick={handleRestore} disabled={loading}>
            {loading ? '// відновлення...' : '↩ Відновити акаунт'}
          </button>
          <button className="rm-btn-ghost" onClick={logout} disabled={loading}>
            Вийти
          </button>
        </div>
      </div>
    </div>
  );
}
