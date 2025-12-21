import { render, screen } from '@testing-library/react';
import { Auth } from '../components/Auth';

describe('Auth Component', () => {
    it('renders login form', () => {
        render(<Auth />);
        expect(screen.getByRole('form')).toBeInTheDocument();
    });
});
