package com.mcp.airadar.paper.service;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.entity.Paper;
import com.mcp.airadar.paper.repository.PaperRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PaperService {

    private final PaperRepository paperRepository;

    public PaperService(PaperRepository paperRepository) {
        this.paperRepository = paperRepository;
    }

    public Page<PaperDto.ListItem> getPaperList(String category, String researchArea, Pageable pageable) {
        Page<Paper> page;
        if (category != null && researchArea != null) {
            page = paperRepository.findByIsActiveTrueAndCategoryAndResearchAreaOrderByPublishedAtDesc(category, researchArea, pageable);
        } else if (category != null) {
            page = paperRepository.findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(category, pageable);
        } else if (researchArea != null) {
            page = paperRepository.findByIsActiveTrueAndResearchAreaOrderByPublishedAtDesc(researchArea, pageable);
        } else {
            page = paperRepository.findByIsActiveTrueOrderByPublishedAtDesc(pageable);
        }
        return page.map(PaperDto.ListItem::from);
    }

    public PaperDto.Detail getPaperDetail(String paperId) {
        Paper paper = paperRepository.findByPaperIdAndIsActiveTrue(paperId)
                .orElseThrow(() -> new EntityNotFoundException("논문을 찾을 수 없습니다: " + paperId));
        return PaperDto.Detail.from(paper);
    }
}
