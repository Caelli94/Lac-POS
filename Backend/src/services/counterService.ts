import { Counter } from '../models/Counter';

export const getNextSequenceValue = async (organization_id: string, entity_type: string): Promise<number> => {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { organization_id, entity_type },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.seq;
};

export const peekNextSequenceValue = async (organization_id: string, entity_type: string): Promise<number> => {
    const sequenceDocument = await Counter.findOne({ organization_id, entity_type });
    return sequenceDocument ? sequenceDocument.seq + 1 : 1;
};
