import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { selectUserName, selectUserRoleId, selectUserRoleName } from '../features/userSlice';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useRole = () => useAppSelector(selectUserRoleId);
export const useRoleName = () => useAppSelector(selectUserRoleName);
export const useName = () => useAppSelector(selectUserName);