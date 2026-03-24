use soroban_sdk::{contractevent, Env, String};

#[contractevent(topics = ["recurring_payment_created"])]
pub struct RecurringPaymentCreated {
    #[topic]
    pub recurring_id: String,
    pub agreement_id: String,
    pub amount: i128,
}

#[contractevent(topics = ["recurring_payment_executed"])]
pub struct RecurringPaymentExecuted {
    #[topic]
    pub recurring_id: String,
    pub executed_at: u64,
}

#[contractevent(topics = ["recurring_payment_paused"])]
pub struct RecurringPaymentPaused {
    #[topic]
    pub recurring_id: String,
}

#[contractevent(topics = ["recurring_payment_resumed"])]
pub struct RecurringPaymentResumed {
    #[topic]
    pub recurring_id: String,
}

#[contractevent(topics = ["recurring_payment_cancelled"])]
pub struct RecurringPaymentCancelled {
    #[topic]
    pub recurring_id: String,
}

#[contractevent(topics = ["recurring_payment_failed"])]
pub struct RecurringPaymentFailed {
    #[topic]
    pub recurring_id: String,
}

pub(crate) fn recurring_payment_created(
    env: &Env,
    recurring_id: String,
    agreement_id: String,
    amount: i128,
) {
    RecurringPaymentCreated {
        recurring_id,
        agreement_id,
        amount,
    }
    .publish(env);
}

pub(crate) fn recurring_payment_executed(env: &Env, recurring_id: String, executed_at: u64) {
    RecurringPaymentExecuted {
        recurring_id,
        executed_at,
    }
    .publish(env);
}

pub(crate) fn recurring_payment_paused(env: &Env, recurring_id: String) {
    RecurringPaymentPaused { recurring_id }.publish(env);
}

pub(crate) fn recurring_payment_resumed(env: &Env, recurring_id: String) {
    RecurringPaymentResumed { recurring_id }.publish(env);
}

pub(crate) fn recurring_payment_cancelled(env: &Env, recurring_id: String) {
    RecurringPaymentCancelled { recurring_id }.publish(env);
}

pub(crate) fn recurring_payment_failed(env: &Env, recurring_id: String) {
    RecurringPaymentFailed { recurring_id }.publish(env);
}
