let connection;
let wallet;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Solana connection (using mainnet-beta)
  connection = new window.solanaWeb3.Connection(
    'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  document.getElementById('loadWallet').addEventListener('click', loadWallet);
  document.getElementById('sendButton').addEventListener('click', sendTransaction);
});

async function loadWallet() {
  try {
    const privateKeyInput = document.getElementById('privateKey').value;
    const keypair = window.solanaWeb3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(privateKeyInput))
    );
    wallet = keypair;

    // Display wallet info
    document.getElementById('walletInfo').style.display = 'block';
    document.getElementById('walletAddress').textContent = wallet.publicKey.toString();
    
    // Load balance
    await updateBalance();
    
    // Load transactions
    await loadTransactions();
  } catch (error) {
    alert('Error loading wallet: ' + error.message);
  }
}

async function updateBalance() {
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    document.getElementById('walletBalance').textContent = 
      (balance / window.solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
  } catch (error) {
    console.error('Error getting balance:', error);
  }
}

async function loadTransactions() {
  try {
    const transactions = await connection.getSignaturesForAddress(wallet.publicKey);
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';

    for (const tx of transactions) {
      const txInfo = await connection.getTransaction(tx.signature);
      const div = document.createElement('div');
      div.className = 'transaction-item';
      div.innerHTML = `
        <p>Signature: ${tx.signature}</p>
        <p>Status: ${tx.confirmationStatus}</p>
        <p>Time: ${new Date(tx.blockTime * 1000).toLocaleString()}</p>
      `;
      transactionList.appendChild(div);
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

async function sendTransaction() {
  try {
    const recipientAddress = new window.solanaWeb3.PublicKey(
      document.getElementById('recipientAddress').value
    );
    const amount = document.getElementById('amount').value;
    
    const transaction = new window.solanaWeb3.Transaction().add(
      window.solanaWeb3.SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientAddress,
        lamports: amount * window.solanaWeb3.LAMPORTS_PER_SOL
      })
    );

    const signature = await window.solanaWeb3.sendAndConfirmTransaction(
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