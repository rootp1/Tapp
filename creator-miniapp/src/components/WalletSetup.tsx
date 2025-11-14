import { TonConnectButton } from '@tonconnect/ui-react';

interface WalletSetupProps {
  onWalletConnected?: () => void;
}

function WalletSetup({}: WalletSetupProps) {
  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div className="card">
        <div className="card-header">
          <h1>💼 Wallet Required</h1>
          <p>Connect your TON wallet to start creating</p>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <div>
              ℹ️ <strong>Why connect a wallet?</strong>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>
                Your TON wallet address is needed to receive payments from your premium content. 
                You'll earn 95% of all post purchases directly to your wallet.
              </p>
            </div>
          </div>

          <div className="wallet-section" style={{ marginTop: '24px' }}>
            <TonConnectButton />
          </div>

          <div className="card-footer">
            <div className="note">
              Your wallet address will be securely stored and used for all future payments.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletSetup;
