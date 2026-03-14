
import { Request, Response } from 'express';
import { Task } from '../models/Task';

// @desc    Get tasks for an organization
// @route   GET /api/tasks
// @query   orgId (required), start (optional), end (optional)
export const getTasks = async (req: Request, res: Response) => {
    const { orgId, start, end } = req.query;

    if (!orgId) {
        return res.status(400).json({ message: 'Organization ID is required' });
    }

    try {
        let query: any = { organization: orgId };

        if (start && end) {
            query.date = {
                $gte: new Date(start as string),
                $lte: new Date(end as string)
            };
        }

        const tasks = await Task.find(query).sort({ date: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new task
// @route   POST /api/tasks
export const createTask = async (req: Request, res: Response) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json(task);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
export const updateTask = async (req: Request, res: Response) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(task);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req: Request, res: Response) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
