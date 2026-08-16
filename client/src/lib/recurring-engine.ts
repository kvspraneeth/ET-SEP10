import db, { RecurringExpense, RecurringDebt } from './db';
import { format, addDays, addWeeks, addMonths, addYears, isValid } from 'date-fns';
import { Expense } from '@shared/schema';

// Helper to safely parse any date format into a clean yyyy-MM-dd string
export function toCleanDateStr(val: any): string {
  if (!val) return format(new Date(), 'yyyy-MM-dd');
  const strVal = String(val).trim().split('T')[0];
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
    return strVal;
  }

  const parsed = new Date(val);
  if (isValid(parsed) && !isNaN(parsed.getTime())) {
    return format(parsed, 'yyyy-MM-dd');
  }

  return format(new Date(), 'yyyy-MM-dd');
}

export function getNextDate(
  dateStr: string,
  frequency: string,
  customCount: number = 1,
  customUnit: string = 'days'
): string {
  const cleanCurrent = toCleanDateStr(dateStr);
  const parts = cleanCurrent.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const count = Math.max(1, Number(customCount) || 1);
  const freq = String(frequency || 'monthly').toLowerCase().trim();

  let nextD: Date;
  switch (freq) {
    case 'daily':
    case 'day':
    case '1 day':
      nextD = addDays(d, 1);
      break;
    case 'weekly':
    case 'week':
    case '1 week':
      nextD = addWeeks(d, 1);
      break;
    case 'yearly':
    case 'year':
    case 'annual':
    case 'annually':
      nextD = addYears(d, 1);
      break;
    case 'custom':
      if (customUnit === 'weeks') nextD = addWeeks(d, count);
      else if (customUnit === 'months') nextD = addMonths(d, count);
      else if (customUnit === 'years') nextD = addYears(d, count);
      else nextD = addDays(d, count);
      break;
    case 'monthly':
    case 'month':
    case '1 month':
    default:
      nextD = addMonths(d, 1);
      break;
  }

  if (!isValid(nextD) || isNaN(nextD.getTime())) {
    nextD = addMonths(d, 1);
  }

  const resultStr = format(nextD, 'yyyy-MM-dd');

  // Hard safety invariant: Next date MUST strictly move forward
  if (resultStr <= cleanCurrent) {
    return format(addDays(d, 1), 'yyyy-MM-dd');
  }

  return resultStr;
}

// Running mutex to prevent concurrent execution
let isProcessing = false;

export async function processRecurringRules(): Promise<{ expensesAdded: number; debtsAdded: number }> {
  if (isProcessing) {
    return { expensesAdded: 0, debtsAdded: 0 };
  }

  isProcessing = true;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  let expensesAdded = 0;
  let debtsAdded = 0;

  try {
    const existingExpenses = await db.expenses.toArray();
    const existingDebts = await db.debts.toArray();

    // 1. Process Recurring Expenses
    const allExpenses = await db.recurringExpenses.toArray();
    const activeExpenses = allExpenses.filter(r => r.isActive !== false);
    const newExpensesToInsert: Expense[] = [];

    for (const rule of activeExpenses) {
      if (!rule.startDate) continue;

      const cleanStartDate = toCleanDateStr(rule.startDate);
      const cleanEndDate = rule.endDate ? toCleanDateStr(rule.endDate) : null;
      
      let checkDate = rule.lastGeneratedDate
        ? getNextDate(rule.lastGeneratedDate, rule.frequency, rule.customIntervalCount, rule.customIntervalUnit)
        : cleanStartDate;

      let lastGenerated = rule.lastGeneratedDate ? toCleanDateStr(rule.lastGeneratedDate) : null;
      let loopGuard = 0;
      const MAX_INSTANCES_PER_RULE = 120; // Maximum instances to create in one cycle

      while (checkDate <= todayStr && loopGuard < MAX_INSTANCES_PER_RULE) {
        loopGuard++;

        if (cleanEndDate && checkDate > cleanEndDate) {
          // Rule reached its end date; deactivate
          await db.recurringExpenses.update(rule.id, { isActive: false });
          break;
        }

        // Check if an expense for this rule and date already exists
        const alreadyExists = existingExpenses.some(e => {
          const eDate = (e.date || '').split('T')[0];
          if (eDate !== checkDate) return false;
          if (e.recurringRuleId && e.recurringRuleId === rule.id) return true;
          // Match by content to prevent duplicates on imported data
          return (
            e.category === rule.category &&
            Math.abs(Number(e.amount) - Number(rule.amount)) < 0.01 &&
            String(e.items || '').trim().toLowerCase() === String(rule.items || '').trim().toLowerCase()
          );
        }) || newExpensesToInsert.some(e => e.recurringRuleId === rule.id && e.date === checkDate);

        if (!alreadyExists) {
          const nowIso = new Date().toISOString();
          const newExp: Expense = {
            id: crypto.randomUUID(),
            amount: Number(rule.amount),
            date: checkDate,
            time: '09:00',
            category: rule.category,
            items: rule.items,
            where: rule.where || '',
            note: rule.note ? `[Recurring] ${rule.note}` : '[Recurring Expense]',
            paymentMethod: rule.paymentMethod || 'UPI',
            account: rule.account || 'SBI',
            isRecurring: true,
            isTemplate: false,
            recurringRuleId: rule.id,
            attachments: [],
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          newExpensesToInsert.push(newExp);
          expensesAdded++;
        }

        lastGenerated = checkDate;
        const prevCheck = checkDate;
        checkDate = getNextDate(checkDate, rule.frequency, rule.customIntervalCount, rule.customIntervalUnit);

        // Safety break if date doesn't progress
        if (checkDate <= prevCheck) {
          break;
        }
      }

      if (lastGenerated && lastGenerated !== rule.lastGeneratedDate) {
        await db.recurringExpenses.update(rule.id, {
          lastGeneratedDate: lastGenerated,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (newExpensesToInsert.length > 0) {
      await db.expenses.bulkAdd(newExpensesToInsert);
    }

    // 2. Process Recurring Debts
    const allDebts = await db.recurringDebts.toArray();
    const activeDebts = allDebts.filter(r => r.isActive !== false);
    const newDebtsToInsert: any[] = [];

    for (const rule of activeDebts) {
      if (!rule.startDate) continue;

      const cleanStartDate = toCleanDateStr(rule.startDate);
      const cleanEndDate = rule.endDate ? toCleanDateStr(rule.endDate) : null;

      let checkDate = rule.lastGeneratedDate
        ? getNextDate(rule.lastGeneratedDate, rule.frequency, rule.customIntervalCount, rule.customIntervalUnit)
        : cleanStartDate;

      let lastGenerated = rule.lastGeneratedDate ? toCleanDateStr(rule.lastGeneratedDate) : null;
      let loopGuard = 0;
      const MAX_INSTANCES_PER_RULE = 120;

      while (checkDate <= todayStr && loopGuard < MAX_INSTANCES_PER_RULE) {
        loopGuard++;

        if (cleanEndDate && checkDate > cleanEndDate) {
          await db.recurringDebts.update(rule.id, { isActive: false });
          break;
        }

        const alreadyExists = existingDebts.some(d => {
          const dDate = (d.datetime || '').split('T')[0];
          if (dDate !== checkDate) return false;
          if (d.recurringRuleId && d.recurringRuleId === rule.id) return true;
          return (
            d.type === rule.type &&
            Math.abs(Number(d.amount) - Number(rule.amount)) < 0.01 &&
            String(d.personName || '').trim().toLowerCase() === String(rule.personName || '').trim().toLowerCase()
          );
        }) || newDebtsToInsert.some(d => d.recurringRuleId === rule.id && d.datetime.startsWith(checkDate));

        if (!alreadyExists) {
          const nowIso = new Date().toISOString();
          newDebtsToInsert.push({
            type: rule.type,
            amount: Number(rule.amount),
            purpose: rule.purpose,
            personName: rule.personName,
            location: rule.location || undefined,
            notes: rule.notes ? `[Recurring] ${rule.notes}` : '[Recurring Due]',
            datetime: `${checkDate}T09:00:00`,
            status: 'pending',
            recurringRuleId: rule.id,
            createdAt: nowIso,
          });
          debtsAdded++;
        }

        lastGenerated = checkDate;
        const prevCheck = checkDate;
        checkDate = getNextDate(checkDate, rule.frequency, rule.customIntervalCount, rule.customIntervalUnit);

        if (checkDate <= prevCheck) {
          break;
        }
      }

      if (lastGenerated && lastGenerated !== rule.lastGeneratedDate) {
        await db.recurringDebts.update(rule.id, {
          lastGeneratedDate: lastGenerated,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (newDebtsToInsert.length > 0) {
      await db.debts.bulkAdd(newDebtsToInsert);
    }
  } catch (err) {
    console.error('Error executing recurring rules engine:', err);
  } finally {
    isProcessing = false;
  }

  return { expensesAdded, debtsAdded };
}
