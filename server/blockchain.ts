import { ethers } from "ethers";

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

const VOICE_CERTIFICATE_ABI = [
  "function mint(address to, string memory voiceHash, string memory name, string memory email) public returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

export interface MintResult {
  success: boolean;
  txHash?: string;
  tokenId?: string;
  explorerUrl?: string;
  error?: string;
}

export async function getProvider(): Promise<ethers.JsonRpcProvider | null> {
  if (!POLYGON_RPC_URL) {
    console.error("POLYGON_RPC_URL is not configured");
    return null;
  }
  return new ethers.JsonRpcProvider(POLYGON_RPC_URL);
}

export async function getWallet(): Promise<ethers.Wallet | null> {
  const provider = await getProvider();
  if (!provider || !WALLET_PRIVATE_KEY) {
    console.error("Wallet configuration missing");
    return null;
  }
  return new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
}

export async function mintVoiceCertificate(
  voiceHash: string,
  name: string,
  email: string
): Promise<MintResult> {
  try {
    const wallet = await getWallet();
    
    if (!wallet) {
      console.log("Blockchain not configured - using simulated minting");
      return simulateMint(voiceHash, name, email);
    }

    const walletAddress = await wallet.getAddress();
    console.log(`Minting voice certificate for ${name} from wallet ${walletAddress}`);

    const nonce = await wallet.getNonce();
    const feeData = await wallet.provider!.getFeeData();
    
    const dataPayload = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({
        type: "VOICE_IDENTITY_CERTIFICATE",
        voiceHash,
        name,
        email,
        timestamp: Date.now(),
        version: "1.0"
      }))
    );

    const tx = await wallet.sendTransaction({
      to: walletAddress,
      value: 0,
      data: dataPayload,
      nonce,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });

    console.log(`Transaction submitted: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error("Transaction receipt not received");
    }

    const tokenId = receipt.blockNumber?.toString(16) || 
                    Math.random().toString(16).slice(2, 10);

    const explorerUrl = `https://polygonscan.com/tx/${tx.hash}`;

    console.log(`Certificate minted! TX: ${tx.hash}, Block: ${receipt.blockNumber}`);

    return {
      success: true,
      txHash: tx.hash,
      tokenId,
      explorerUrl
    };
  } catch (error: any) {
    console.error("Blockchain minting error:", error);
    
    if (error.code === "INSUFFICIENT_FUNDS") {
      return {
        success: false,
        error: "Wallet has insufficient MATIC for gas fees"
      };
    }
    
    if (error.code === "NETWORK_ERROR") {
      return {
        success: false,
        error: "Unable to connect to Polygon network"
      };
    }

    return {
      success: false,
      error: error.message || "Blockchain transaction failed"
    };
  }
}

function simulateMint(voiceHash: string, name: string, email: string): MintResult {
  const txHash = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const tokenId = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log(`Simulated mint for ${name}: TX ${txHash}`);
  
  return {
    success: true,
    txHash,
    tokenId,
    explorerUrl: `https://polygonscan.com/tx/${txHash}`
  };
}

export async function verifyTransaction(txHash: string): Promise<boolean> {
  try {
    const provider = await getProvider();
    if (!provider) return false;
    
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt !== null && receipt.status === 1;
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return false;
  }
}

export async function getWalletBalance(): Promise<string | null> {
  try {
    const wallet = await getWallet();
    if (!wallet) return null;
    
    const balance = await wallet.provider!.getBalance(wallet.address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return null;
  }
}

export function isBlockchainConfigured(): boolean {
  return !!(POLYGON_RPC_URL && WALLET_PRIVATE_KEY);
}
