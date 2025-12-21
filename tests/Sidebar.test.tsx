import { render, screen } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';

describe('Sidebar Component', () => {
    it('renders sidebar navigation', () => {
        render(<Sidebar />);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
});
