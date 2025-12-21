import { render, screen } from '@testing-library/react';
import { TodoView } from '../components/TodoView';

describe('TodoView Component', () => {
    it('renders todo list', () => {
        render(<TodoView />);
        expect(screen.getByText(/todo/i)).toBeInTheDocument();
    });
});
