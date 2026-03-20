import React from 'react';
import { SCHOOL_NAME } from '../../config/constants';
import { Heart, Globe, Mail, Phone } from 'lucide-react';

interface Props {
    onNavigate: (view: string) => void;
}

const Footer: React.FC<Props> = ({ onNavigate }) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-slate-200 pt-16 pb-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand & Mission */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl font-black text-slate-800 tracking-tight">
                                ÍtOng<span className="text-blue-600">Quiz</span>
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Hệ thống luyện thi các môn học chính khóa được thiết kế dành riêng cho học sinh Tiểu học.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="p-2 bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-all">
                                <Globe className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-all">
                                <Mail className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-all">
                                <Phone className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-6 uppercase text-xs tracking-widest">Khám phá</h4>
                        <ul className="space-y-4">
                            <li><button onClick={() => onNavigate('home')} className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Trang chủ</button></li>
                            <li><button className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Kho ứng dụng</button></li>
                            <li><button className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Xếp hạng</button></li>
                        </ul>
                    </div>

                    {/* Support & Legal */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-6 uppercase text-xs tracking-widest">Hỗ trợ & Pháp lý</h4>
                        <ul className="space-y-4">
                            <li><button onClick={() => onNavigate('privacy')} className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Chính sách Bảo mật</button></li>
                            <li><button onClick={() => onNavigate('tos')} className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Điều khoản Sử dụng</button></li>
                            <li><button className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">Trợ giúp (Trợ lý AI)</button></li>
                        </ul>
                    </div>

                    {/* School Info */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-6 uppercase text-xs tracking-widest">Thông tin trường</h4>
                        <p className="text-slate-600 text-sm font-semibold mb-2">{SCHOOL_NAME}</p>
                        <p className="text-slate-500 text-xs leading-relaxed">
                            Xã Mường La, Tỉnh Sơn La
                        </p>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-400 text-xs">
                        © {currentYear} Ít Ong Quiz Team. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
