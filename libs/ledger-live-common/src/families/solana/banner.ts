import { getCurrentSolanaPreloadData } from "@ledgerhq/coin-solana/preload-data";
import { stakeActions } from "@ledgerhq/coin-solana/logic";
import { LEDGER_VALIDATOR } from "@ledgerhq/coin-solana/utils";
import type { SolanaAccount } from "@ledgerhq/coin-solana/types";
import { ValidatorsAppValidator } from "@ledgerhq/coin-solana/validator-app/index";
import { isAccountEmpty } from "../../account";

export interface AccountBannerState {
  display: boolean;
  redelegate: boolean;
  stakeAccAddr: string;
  ledgerValidator: ValidatorsAppValidator | undefined;
}

export function getAccountBannerState(account: SolanaAccount): AccountBannerState {
  // Group current validator
  const solanaResources = account.solanaResources ? account.solanaResources : { stakes: [] };
  const delegations = solanaResources?.stakes.map(delegation => {
    return delegation;
  });

  // Get ledger validator data
  const { validators } = getCurrentSolanaPreloadData(account.currency) ?? {
    validators: [],
  };
  const ledgerValidator = validators.find(
    validator => validator.voteAccount === LEDGER_VALIDATOR.voteAccount,
  );

  // If Ledger doesn't provide validator, we don't display banner
  if (!ledgerValidator) {
    return {
      display: false,
      redelegate: false,
      stakeAccAddr: "",
      ledgerValidator,
    };
  }

  let redelegate = false;
  let stakeAccAddr = "";
  let display = false;

  // Find user current worst validator (default validator is ledger)
  let worstValidator = ledgerValidator;
  for (const delegation of delegations) {
    const validatorAdress = delegation.delegation?.voteAccAddr;
    const validator = validators.find(validator => validator.voteAccount === validatorAdress);
    const actions = stakeActions(delegation);
    const isValidRedelegation =
      validator &&
      validatorAdress !== ledgerValidator.voteAccount &&
      worstValidator.commission <= validator.commission &&
      actions.includes("deactivate");
    if (isValidRedelegation) {
      stakeAccAddr = delegation.stakeAccAddr;
      worstValidator = validator;
    }
  }
  if (worstValidator) {
    if (worstValidator?.voteAccount === ledgerValidator?.voteAccount) {
      if (!isAccountEmpty(account)) {
        display = true;
      }
    } else {
      redelegate = true;
      display = true;
    }
  }

  return {
    display,
    redelegate,
    stakeAccAddr,
    ledgerValidator,
  };
}
