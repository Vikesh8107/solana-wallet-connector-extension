import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

// Global variables
let connection;
let wallet = null; // Initialize wallet as null

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Solana connection (using mainnet-beta)
  connection = new Connection(
    'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  // Add event listeners
  document.getElementById('loadWallet').addEventListener('click', loadWallet);
  document.getElementById('sendButton').addEventListener('click', sendTransaction);

  // Load saved private key if exists
  const savedKey = localStorage.getItem('walletPrivateKey');
  if (savedKey) {
    document.getElementById('privateKey').value = savedKey;
    await loadWallet(true); // Pass true to indicate auto-loading
  }

  setupSettingsModal();
});

async function loadWallet(isAutoLoad = false) {
  try {
    const privateKeyInput = document.getElementById('privateKey').value.trim();
    let privateKeyBytes;

    // Try different private key formats
    try {
      if (privateKeyInput.startsWith('[') && privateKeyInput.endsWith(']')) {
        // Handle array format (Solflare style)
        const numberArray = JSON.parse(privateKeyInput);
        if (!Array.isArray(numberArray) || numberArray.length !== 64) {
          throw new Error('Invalid array length. Expected 64 numbers.');
        }
        privateKeyBytes = new Uint8Array(numberArray);
      } else {
        // Handle Base58 format (Phantom style)
        privateKeyBytes = bs58.decode(privateKeyInput);
      }

      // Create wallet from private key
      wallet = Keypair.fromSecretKey(privateKeyBytes);

      // Save private key to localStorage
      localStorage.setItem('walletPrivateKey', privateKeyInput);

      // Show success message (only if not auto-loading)
      if (!isAutoLoad) {
        const walletType = privateKeyInput.startsWith('[') ? 'Solflare' : 'Phantom';
        showNotification(`${walletType} wallet loaded successfully!`, 'success');
      }

      // Display wallet info
      document.getElementById('walletInfo').style.display = 'block';
      document.getElementById('walletAddress').textContent = wallet.publicKey.toString();
      
      // Load balance
      await updateBalance();
      
      // Load transactions
      await loadTransactions();

      if (wallet) {
        // Hide input section after successful wallet load
        document.getElementById('inputSection').style.display = 'none';
      }

    } catch (e) {
      throw new Error('Invalid private key format. Please provide a valid Solana private key (Base58 or Array format)');
    }
  } catch (error) {
    if (!isAutoLoad) { // Show error only if not auto-loading
      showNotification(error.message, 'error');
    }
  }
}

async function updateBalance() {
  try {
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not loaded');
    }
    const balance = await connection.getBalance(wallet.publicKey);
    document.getElementById('walletBalance').textContent = 
      (balance / LAMPORTS_PER_SOL).toFixed(4);
  } catch (error) {
    console.error('Error getting balance:', error);
  }
}

async function loadTransactions() {
  try {
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not loaded');
    }
    const transactions = await connection.getSignaturesForAddress(wallet.publicKey);
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';

    for (const tx of transactions) {
      const txInfo = await connection.getTransaction(tx.signature);
      const div = document.createElement('div');
      div.className = 'transaction-item';
      
      // Format amount - assuming it's a transfer
      let amount = 'N/A';
      if (txInfo?.meta?.postBalances && txInfo?.meta?.preBalances) {
        const difference = Math.abs(txInfo.meta.postBalances[0] - txInfo.meta.preBalances[0]);
        amount = (difference / LAMPORTS_PER_SOL).toFixed(4);
      }

      // Format timestamp
      const timestamp = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Pending';

      // Determine if incoming or outgoing
      const isIncoming = txInfo?.meta?.postBalances[0] > txInfo?.meta?.preBalances[0];
      
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isIncoming ? 'rgba(20, 241, 149, 0.1)' : 'rgba(255, 69, 58, 0.1)'}; 
                        display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <i class="fas fa-${isIncoming ? 'arrow-down' : 'arrow-up'}" style="color: ${isIncoming ? '#14F195' : '#FF453A'};"></i>
            </div>
            <div>
              <div style="font-weight: 500;">${isIncoming ? 'Received' : 'Sent'}</div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${timestamp}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 500;">${amount} SOL</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
              ${tx.signature.slice(0, 4)}...${tx.signature.slice(-4)}
            </div>
          </div>
        </div>
      `;
      transactionList.appendChild(div);
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

async function sendTransaction() {
  try {
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not loaded');
    }

    const recipientAddress = new PublicKey(
      document.getElementById('recipientAddress').value
    );
    const amount = document.getElementById('amount').value;
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientAddress,
        lamports: amount * LAMPORTS_PER_SOL
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet]
    );

    alert('Transaction sent! Signature: ' + signature);
    
    // Update balance and transactions
    await updateBalance();
    await loadTransactions();
  } catch (error) {
    alert('Error sending transaction: ' + error.message);
  }
}

// Add notification function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;

  // Set background color based on type
  switch (type) {
    case 'success':
      notification.style.background = 'linear-gradient(45deg, #14F195, #0EA5E9)';
      break;
    case 'error':
      notification.style.background = 'linear-gradient(45deg, #FF453A, #FF9500)';
      break;
    default:
      notification.style.background = 'linear-gradient(45deg, #9945FF, #14F195)';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations to styles.css
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

// Update the logout functionality
function addLogoutButton() {
  const logoutButton = document.createElement('button');
  logoutButton.className = 'button';
  logoutButton.style.cssText = `
    background: rgba(255, 69, 58, 0.1);
    color: #FF453A;
    margin-top: 16px;
    width: 100%;
  `;
  logoutButton.innerHTML = '<i class="fas fa-sign-out-alt" style="margin-right: 8px;"></i>Disconnect Wallet';
  logoutButton.onclick = () => {
    // Clear localStorage
    localStorage.removeItem('walletPrivateKey');
    wallet = null;
    
    // Reset input field
    document.getElementById('privateKey').value = '';
    
    // Hide wallet info
    document.getElementById('walletInfo').style.display = 'none';
    
    // Show input section
    document.getElementById('inputSection').style.display = 'block';
    
    // Show notification
    showNotification('Wallet disconnected successfully', 'info');
  };

  // Add logout button to the wallet info section
  document.getElementById('walletInfo').appendChild(logoutButton);
}

// Call this function after wallet info section is created
addLogoutButton();

function setupSettingsModal() {
  const settingsIcon = document.getElementById('settingsIcon');
  const settingsModal = document.getElementById('settingsModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const closeSettings = document.getElementById('closeSettings');
  const showPrivateKey = document.getElementById('showPrivateKey');
  const hidePrivateKey = document.getElementById('hidePrivateKey');
  const privateKeyDisplay = document.getElementById('privateKeyDisplay');

  settingsIcon.onclick = () => {
    settingsModal.style.display = 'block';
    modalBackdrop.style.display = 'block';
  };

  closeSettings.onclick = () => {
    settingsModal.style.display = 'none';
    modalBackdrop.style.display = 'none';
    // Hide private key when closing modal
    privateKeyDisplay.style.display = 'none';
    showPrivateKey.style.display = 'block';
    hidePrivateKey.style.display = 'none';
  };

  modalBackdrop.onclick = closeSettings.onclick;

  showPrivateKey.onclick = () => {
    const savedKey = localStorage.getItem('walletPrivateKey');
    if (savedKey) {
      privateKeyDisplay.querySelector('.private-key-content').textContent = savedKey;
      privateKeyDisplay.style.display = 'block';
      showPrivateKey.style.display = 'none';
      hidePrivateKey.style.display = 'block';
      
      // Add copy button dynamically
      const copyButton = document.createElement('button');
      copyButton.className = 'settings-button';
      copyButton.style.marginTop = '12px';
      copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Private Key';
      copyButton.onclick = () => {
        navigator.clipboard.writeText(savedKey);
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Private Key';
        }, 2000);
      };
      privateKeyDisplay.appendChild(copyButton);
    }
  };

  hidePrivateKey.onclick = () => {
    privateKeyDisplay.style.display = 'none';
    showPrivateKey.style.display = 'block';
    hidePrivateKey.style.display = 'none';
  };
} 