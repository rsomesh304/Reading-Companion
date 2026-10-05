import { createContext, useContext } from "react";

export const AccountContext = createContext(null);

export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("useAccount must be used inside AccountGate");
  return account;
}
